import { Head, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Cloud,
    CloudOff,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { TaskRepository } from '@/repositories/taskRepository';
import { index as tasksIndex } from '@/routes/tasks';
import { TaskSyncService } from '@/services/syncService';
import type { Task, TaskSyncStatus } from '@/types/task';

const statusLabels: Record<TaskSyncStatus, string> = {
    synced: 'Synced',
    pending_create: 'Pending create',
    pending_update: 'Pending update',
    pending_delete: 'Pending delete',
    conflict: 'Conflict',
    failed: 'Failed',
};

function statusVariant(
    status: TaskSyncStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'conflict' || status === 'failed') {
        return 'destructive';
    }

    if (status === 'synced') {
        return 'outline';
    }

    return 'secondary';
}

type TaskItemProps = {
    task: Task;
    onUpdate: (
        id: string,
        changes: Partial<Pick<Task, 'title' | 'description' | 'completed'>>,
    ) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onKeepLocal: (id: string) => Promise<void>;
    onUseServer: (id: string) => Promise<void>;
};

function TaskItem({
    task,
    onUpdate,
    onDelete,
    onKeepLocal,
    onUseServer,
}: TaskItemProps) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? '');

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!title.trim()) {
            return;
        }

        await onUpdate(task.id, { title, description });
        setEditing(false);
    }

    function beginEditing() {
        setTitle(task.title);
        setDescription(task.description ?? '');
        setEditing(true);
    }

    return (
        <Card className="gap-4 py-4">
            <CardContent className="space-y-4 px-4 sm:px-6">
                {editing ? (
                    <form className="space-y-3" onSubmit={save}>
                        <Input
                            aria-label="Task title"
                            maxLength={255}
                            onChange={(event) => setTitle(event.target.value)}
                            required
                            value={title}
                        />
                        <textarea
                            aria-label="Task description"
                            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            maxLength={2000}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Description (optional)"
                            value={description}
                        />
                        <div className="flex gap-2">
                            <Button size="sm" type="submit">
                                Save locally
                            </Button>
                            <Button
                                onClick={() => setEditing(false)}
                                size="sm"
                                type="button"
                                variant="outline"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex items-start gap-3">
                        <Checkbox
                            aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}
                            checked={task.completed}
                            className="mt-1"
                            onCheckedChange={(checked) =>
                                void onUpdate(task.id, {
                                    completed: checked === true,
                                })
                            }
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3
                                    className={
                                        task.completed
                                            ? 'font-medium text-muted-foreground line-through'
                                            : 'font-medium'
                                    }
                                >
                                    {task.title}
                                </h3>
                                <Badge
                                    variant={statusVariant(task.sync_status)}
                                >
                                    {statusLabels[task.sync_status]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    v{task.version}
                                </span>
                            </div>
                            {task.description && (
                                <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                                    {task.description}
                                </p>
                            )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                            <Button
                                aria-label={`Edit ${task.title}`}
                                onClick={beginEditing}
                                size="icon"
                                variant="ghost"
                            >
                                <Pencil />
                            </Button>
                            <Button
                                aria-label={`Delete ${task.title}`}
                                onClick={() => void onDelete(task.id)}
                                size="icon"
                                variant="ghost"
                            >
                                <Trash2 />
                            </Button>
                        </div>
                    </div>
                )}

                {(task.sync_status === 'conflict' ||
                    task.sync_status === 'failed') && (
                    <Alert variant="destructive">
                        <AlertTriangle />
                        <AlertTitle>
                            {task.sync_status === 'conflict'
                                ? 'Synchronization conflict'
                                : 'Synchronization failed'}
                        </AlertTitle>
                        <AlertDescription>
                            <p>
                                {task.sync_error ??
                                    'This change needs your attention.'}
                            </p>
                            {task.sync_status === 'conflict' && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                        onClick={() =>
                                            void onKeepLocal(task.id)
                                        }
                                        size="sm"
                                        variant="outline"
                                    >
                                        Keep local change
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            void onUseServer(task.id)
                                        }
                                        size="sm"
                                        variant="outline"
                                    >
                                        Use server version
                                    </Button>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

export default function TasksIndex() {
    const { auth } = usePage().props;
    const repository = useMemo(
        () => new TaskRepository(auth.user.id),
        [auth.user.id],
    );
    const syncService = useMemo(
        () => new TaskSyncService(repository),
        [repository],
    );
    const [tasks, setTasks] = useState<Task[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [localLoading, setLocalLoading] = useState(true);
    const online = useOnlineStatus();
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const synchronize = useCallback(async () => {
        if (!navigator.onLine) {
            return;
        }

        setSyncing(true);
        setSyncError(null);

        try {
            const result = await syncService.sync();

            if (result.conflicts > 0) {
                setSyncMessage(
                    `${result.conflicts} conflict${result.conflicts === 1 ? '' : 's'} need attention.`,
                );
            } else if (result.pushed > 0) {
                setSyncMessage(
                    `${result.pushed} change${result.pushed === 1 ? '' : 's'} synchronized.`,
                );
            } else {
                setSyncMessage('Tasks are up to date.');
            }
        } catch (error) {
            setSyncError(
                error instanceof Error
                    ? error.message
                    : 'Synchronization failed.',
            );
        } finally {
            setSyncing(false);
        }
    }, [syncService]);

    useEffect(() => {
        const unsubscribe = repository.observe(
            (snapshot) => {
                setTasks(snapshot.tasks);
                setPendingCount(snapshot.pendingCount);
                setLocalLoading(false);
            },
            (error) => {
                setSyncError(
                    error instanceof Error
                        ? error.message
                        : 'Could not read tasks stored on this device.',
                );
                setLocalLoading(false);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [repository]);

    useEffect(() => {
        if (!online) {
            return;
        }

        const automaticSync = window.setTimeout(() => {
            void synchronize();
        }, 0);

        return () => window.clearTimeout(automaticSync);
    }, [online, synchronize]);

    async function afterLocalMutation() {
        setSyncMessage(null);
        setSyncError(null);

        if (navigator.onLine) {
            await synchronize();
        }
    }

    async function createTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!title.trim()) {
            return;
        }

        await repository.create({ title, description });
        setTitle('');
        setDescription('');
        await afterLocalMutation();
    }

    async function updateTask(
        id: string,
        changes: Partial<Pick<Task, 'title' | 'description' | 'completed'>>,
    ) {
        await repository.update(id, changes);
        await afterLocalMutation();
    }

    async function deleteTask(id: string) {
        await repository.delete(id);
        await afterLocalMutation();
    }

    async function keepLocalConflict(id: string) {
        await repository.keepLocalConflict(id);
        await afterLocalMutation();
    }

    async function useServerConflict(id: string) {
        await repository.useServerConflict(id);
        await afterLocalMutation();
    }

    return (
        <>
            <Head title="Tasks" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Offline Tasks
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Changes are saved to this device first, then synced
                            to Laravel.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={online ? 'default' : 'outline'}>
                            {online ? <Cloud /> : <CloudOff />}
                            {online ? 'Online' : 'Offline'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {pendingCount} change{pendingCount === 1 ? '' : 's'}
                            {' waiting to sync'}
                        </span>
                        <Button
                            disabled={!online || syncing}
                            onClick={() => void synchronize()}
                            size="sm"
                            variant="outline"
                        >
                            <RefreshCw
                                className={syncing ? 'animate-spin' : undefined}
                            />
                            {syncing ? 'Syncing' : 'Sync Now'}
                        </Button>
                    </div>
                </div>

                {!online && (
                    <Alert>
                        <CloudOff />
                        <AlertTitle>You are working offline</AlertTitle>
                        <AlertDescription>
                            Create, edit, complete, and delete tasks normally.
                            Pending changes will sync when connectivity returns.
                        </AlertDescription>
                    </Alert>
                )}

                {syncError && (
                    <Alert variant="destructive">
                        <AlertTriangle />
                        <AlertTitle>Could not synchronize</AlertTitle>
                        <AlertDescription>{syncError}</AlertDescription>
                    </Alert>
                )}

                {syncMessage && !syncError && online && (
                    <p className="text-sm text-muted-foreground" role="status">
                        {syncMessage}
                    </p>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Create a task</CardTitle>
                        <CardDescription>
                            This form works without a network connection.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-3" onSubmit={createTask}>
                            <Input
                                maxLength={255}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                placeholder="What needs to be done?"
                                required
                                value={title}
                            />
                            <textarea
                                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                maxLength={2000}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Description (optional)"
                                value={description}
                            />
                            <Button type="submit">
                                <Plus />
                                Save locally
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <section
                    className="space-y-3"
                    aria-labelledby="task-list-title"
                >
                    <h2 className="text-lg font-semibold" id="task-list-title">
                        Your tasks
                    </h2>
                    {localLoading ? (
                        <Card className="animate-pulse py-8">
                            <CardContent className="text-sm text-muted-foreground">
                                Reading tasks from this device…
                            </CardContent>
                        </Card>
                    ) : tasks.length === 0 ? (
                        <Card className="py-8">
                            <CardContent className="text-center text-sm text-muted-foreground">
                                No tasks yet. Create one above—even while
                                offline.
                            </CardContent>
                        </Card>
                    ) : (
                        tasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                onDelete={deleteTask}
                                onKeepLocal={keepLocalConflict}
                                onUpdate={updateTask}
                                onUseServer={useServerConflict}
                                task={task}
                            />
                        ))
                    )}
                </section>
            </div>
        </>
    );
}

TasksIndex.layout = {
    breadcrumbs: [
        {
            title: 'Tasks',
            href: tasksIndex(),
        },
    ],
};
