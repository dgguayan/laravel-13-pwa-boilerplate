import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Task } from '@/types/task';

export class TaskDatabase extends Dexie {
    tasks!: Table<Task, string>;

    constructor(userId: number) {
        super(`mkwd-offline-tasks-user-${userId}`);

        this.version(1).stores({
            tasks: 'id, sync_status, updated_at, deleted_at',
        });
    }
}

const taskDatabases = new Map<number, TaskDatabase>();

export function getTaskDatabase(userId: number): TaskDatabase {
    const existingDatabase = taskDatabases.get(userId);

    if (existingDatabase) {
        return existingDatabase;
    }

    const database = new TaskDatabase(userId);
    taskDatabases.set(userId, database);

    return database;
}
