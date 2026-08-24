import {
    show as pullTasks,
    store as pushTasks,
} from '@/actions/App/Http/Controllers/TaskSyncController';
import { csrfHeaders } from '@/lib/csrf';
import type { TaskRepository } from '@/repositories/taskRepository';
import type { TaskPullResponse, TaskPushResponse } from '@/types/task';

export type SyncSummary = {
    pushed: number;
    conflicts: number;
    failed: number;
};

class SyncHttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

async function requestJson<T>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.method === 'POST' ? csrfHeaders() : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
            message?: string;
        } | null;

        throw new SyncHttpError(
            response.status,
            errorBody?.message ??
                `Synchronization failed (${response.status}).`,
        );
    }

    return (await response.json()) as T;
}

export class TaskSyncService {
    private inFlight: Promise<SyncSummary> | null = null;

    constructor(private readonly repository: TaskRepository) {}

    sync(): Promise<SyncSummary> {
        if (!navigator.onLine) {
            return Promise.reject(
                new Error(
                    'You are offline. Changes remain saved on this device.',
                ),
            );
        }

        if (this.inFlight) {
            return this.inFlight;
        }

        this.inFlight = this.performSync().finally(() => {
            this.inFlight = null;
        });

        return this.inFlight;
    }

    private async performSync(): Promise<SyncSummary> {
        const pullResponse = await requestJson<TaskPullResponse>(
            pullTasks.url(),
        );
        await this.repository.mergeServerTasks(pullResponse.data);

        const pendingTasks = await this.repository.pendingChanges();
        let conflicts = 0;
        let failed = 0;

        if (pendingTasks.length > 0) {
            try {
                const pushResponse = await requestJson<TaskPushResponse>(
                    pushTasks.url(),
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            operations: pendingTasks.map((task) =>
                                this.repository.toSyncOperation(task),
                            ),
                        }),
                    },
                );

                await this.repository.applyPushResults(
                    pendingTasks,
                    pushResponse.data,
                );

                conflicts = pushResponse.data.filter(
                    (result) => result.status === 'conflict',
                ).length;
                failed = pushResponse.data.filter(
                    (result) => result.status === 'failed',
                ).length;
            } catch (error) {
                if (error instanceof SyncHttpError && error.status === 422) {
                    await this.repository.markFailed(
                        pendingTasks,
                        error.message,
                    );
                }

                throw error;
            }
        }

        return {
            pushed: pendingTasks.length,
            conflicts,
            failed,
        };
    }
}
