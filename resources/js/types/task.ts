export type TaskSyncStatus =
    | 'synced'
    | 'pending_create'
    | 'pending_update'
    | 'pending_delete'
    | 'conflict'
    | 'failed';

export type ServerTask = {
    id: string;
    title: string;
    description: string | null;
    completed: boolean;
    version: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};

export type Task = ServerTask & {
    sync_status: TaskSyncStatus;
    sync_error?: string | null;
    conflict_server?: ServerTask | null;
};

export type TaskDraft = {
    title: string;
    description?: string | null;
};

export type TaskChanges = Partial<
    Pick<Task, 'title' | 'description' | 'completed'>
>;

export type TaskSyncOperationType = 'create' | 'update' | 'delete';

export type TaskSyncOperation = Pick<
    Task,
    'id' | 'title' | 'description' | 'completed' | 'version'
> & {
    type: TaskSyncOperationType;
};

export type TaskSyncResult = {
    id: string;
    operation: TaskSyncOperationType;
    status: 'synced' | 'conflict' | 'failed';
    task: ServerTask | null;
    message: string | null;
};

export type TaskPullResponse = {
    data: ServerTask[];
};

export type TaskPushResponse = {
    data: TaskSyncResult[];
};
