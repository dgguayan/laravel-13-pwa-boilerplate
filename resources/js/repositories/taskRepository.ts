import { liveQuery } from 'dexie';
import { getTaskDatabase } from '@/lib/db';
import type { TaskDatabase } from '@/lib/db';
import { createUuid } from '@/lib/uuid';
import type {
    ServerTask,
    Task,
    TaskChanges,
    TaskDraft,
    TaskSyncOperation,
    TaskSyncOperationType,
    TaskSyncResult,
    TaskSyncStatus,
} from '@/types/task';

const pendingStatuses: TaskSyncStatus[] = [
    'pending_create',
    'pending_update',
    'pending_delete',
];

function operationType(task: Task): TaskSyncOperationType {
    switch (task.sync_status) {
        case 'pending_create':
            return 'create';
        case 'pending_delete':
            return 'delete';
        default:
            return 'update';
    }
}

function localTask(
    task: ServerTask,
    syncStatus: TaskSyncStatus = 'synced',
): Task {
    return {
        ...task,
        sync_status: syncStatus,
        sync_error: null,
        conflict_server: null,
    };
}

export class TaskRepository {
    private readonly database: TaskDatabase;

    constructor(userId: number) {
        this.database = getTaskDatabase(userId);
    }

    observe(
        onChange: (snapshot: { tasks: Task[]; pendingCount: number }) => void,
        onError: (error: unknown) => void,
    ): () => void {
        const subscription = liveQuery(async () => ({
            tasks: await this.all(),
            pendingCount: await this.pendingCount(),
        })).subscribe({
            next: onChange,
            error: onError,
        });

        return () => subscription.unsubscribe();
    }

    async all(): Promise<Task[]> {
        const tasks = await this.database.tasks.toArray();

        return tasks
            .filter((task) => task.deleted_at === null)
            .sort((first, second) =>
                second.updated_at.localeCompare(first.updated_at),
            );
    }

    async get(id: string): Promise<Task | undefined> {
        return this.database.tasks.get(id);
    }

    async pendingChanges(): Promise<Task[]> {
        return this.database.tasks
            .where('sync_status')
            .anyOf(pendingStatuses)
            .toArray();
    }

    async pendingCount(): Promise<number> {
        return this.database.tasks
            .where('sync_status')
            .anyOf(pendingStatuses)
            .count();
    }

    async create(draft: TaskDraft): Promise<Task> {
        const timestamp = new Date().toISOString();
        const task: Task = {
            id: createUuid(),
            title: draft.title.trim(),
            description: draft.description?.trim() || null,
            completed: false,
            version: 0,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
            sync_status: 'pending_create',
            sync_error: null,
            conflict_server: null,
        };

        await this.database.tasks.add(task);

        return task;
    }

    async update(id: string, changes: TaskChanges): Promise<Task> {
        const task = await this.database.tasks.get(id);

        if (!task || task.deleted_at !== null) {
            throw new Error('Task is no longer available.');
        }

        const updatedTask: Task = {
            ...task,
            ...changes,
            title: changes.title?.trim() ?? task.title,
            description:
                changes.description === undefined
                    ? task.description
                    : changes.description?.trim() || null,
            updated_at: new Date().toISOString(),
            sync_status:
                task.sync_status === 'pending_create'
                    ? 'pending_create'
                    : 'pending_update',
            sync_error: null,
            conflict_server: null,
        };

        await this.database.tasks.put(updatedTask);

        return updatedTask;
    }

    async delete(id: string): Promise<void> {
        const task = await this.database.tasks.get(id);

        if (!task) {
            return;
        }

        const timestamp = new Date().toISOString();

        await this.database.tasks.put({
            ...task,
            deleted_at: timestamp,
            updated_at: timestamp,
            sync_status: 'pending_delete',
            sync_error: null,
            conflict_server: null,
        });
    }

    toSyncOperation(task: Task): TaskSyncOperation {
        return {
            id: task.id,
            type: operationType(task),
            title: task.title,
            description: task.description,
            completed: task.completed,
            version: task.version,
        };
    }

    async applyPushResults(
        sentTasks: Task[],
        results: TaskSyncResult[],
    ): Promise<void> {
        const sentById = new Map(sentTasks.map((task) => [task.id, task]));

        await this.database.transaction('rw', this.database.tasks, async () => {
            for (const result of results) {
                const sentTask = sentById.get(result.id);
                const currentTask = await this.database.tasks.get(result.id);

                if (!sentTask || !currentTask) {
                    continue;
                }

                const changedWhileSyncing =
                    currentTask.updated_at !== sentTask.updated_at ||
                    currentTask.sync_status !== sentTask.sync_status;

                if (result.status === 'synced') {
                    await this.applySuccessfulResult(
                        currentTask,
                        sentTask,
                        result,
                        changedWhileSyncing,
                    );
                    continue;
                }

                if (result.status === 'conflict') {
                    await this.database.tasks.put({
                        ...currentTask,
                        version: result.task?.version ?? currentTask.version,
                        sync_status: 'conflict',
                        sync_error:
                            result.message ??
                            'The server has a different version.',
                        conflict_server: result.task,
                    });
                    continue;
                }

                if (!changedWhileSyncing) {
                    await this.database.tasks.put({
                        ...currentTask,
                        sync_status: 'failed',
                        sync_error:
                            result.message ??
                            'The server rejected this change.',
                    });
                }
            }
        });
    }

    async markFailed(sentTasks: Task[], message: string): Promise<void> {
        await this.database.transaction('rw', this.database.tasks, async () => {
            for (const sentTask of sentTasks) {
                const currentTask = await this.database.tasks.get(sentTask.id);

                if (
                    currentTask &&
                    currentTask.updated_at === sentTask.updated_at &&
                    currentTask.sync_status === sentTask.sync_status
                ) {
                    await this.database.tasks.put({
                        ...currentTask,
                        sync_status: 'failed',
                        sync_error: message,
                    });
                }
            }
        });
    }

    async mergeServerTasks(serverTasks: ServerTask[]): Promise<void> {
        const serverIds = new Set(serverTasks.map((task) => task.id));

        await this.database.transaction('rw', this.database.tasks, async () => {
            for (const serverTask of serverTasks) {
                const currentTask = await this.database.tasks.get(
                    serverTask.id,
                );

                if (!currentTask || currentTask.sync_status === 'synced') {
                    await this.database.tasks.put(localTask(serverTask));
                }
            }

            const localTasks = await this.database.tasks.toArray();

            for (const task of localTasks) {
                if (task.sync_status === 'synced' && !serverIds.has(task.id)) {
                    await this.database.tasks.delete(task.id);
                }
            }
        });
    }

    async keepLocalConflict(id: string): Promise<void> {
        const task = await this.database.tasks.get(id);

        if (!task || task.sync_status !== 'conflict') {
            return;
        }

        await this.database.tasks.put({
            ...task,
            version: task.conflict_server?.version ?? 0,
            updated_at: new Date().toISOString(),
            sync_status: task.conflict_server
                ? 'pending_update'
                : 'pending_create',
            sync_error: null,
            conflict_server: null,
        });
    }

    async useServerConflict(id: string): Promise<void> {
        const task = await this.database.tasks.get(id);

        if (!task || task.sync_status !== 'conflict') {
            return;
        }

        if (task.conflict_server) {
            await this.database.tasks.put(localTask(task.conflict_server));

            return;
        }

        await this.database.tasks.delete(id);
    }

    private async applySuccessfulResult(
        currentTask: Task,
        sentTask: Task,
        result: TaskSyncResult,
        changedWhileSyncing: boolean,
    ): Promise<void> {
        if (!result.task) {
            await this.database.tasks.delete(result.id);

            return;
        }

        if (!changedWhileSyncing) {
            await this.database.tasks.put(localTask(result.task));

            return;
        }

        const nextStatus =
            sentTask.sync_status === 'pending_create' &&
            currentTask.sync_status === 'pending_create'
                ? 'pending_update'
                : currentTask.sync_status;

        await this.database.tasks.put({
            ...currentTask,
            created_at: result.task.created_at,
            version: result.task.version,
            sync_status: nextStatus,
            sync_error: null,
            conflict_server: null,
        });
    }
}
