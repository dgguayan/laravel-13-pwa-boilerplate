<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskSyncRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;

class TaskSyncController extends Controller
{
    public function show(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        Gate::forUser($user)->authorize('viewAny', Task::class);

        return TaskResource::collection(
            $user->tasks()->withTrashed()->orderBy('created_at')->get(),
        );
    }

    public function store(TaskSyncRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array{operations: list<array{id: string, type: string, title: string, description?: string|null, completed: bool, version: int}>} $validated */
        $validated = $request->validated();

        $results = collect($validated['operations'])
            ->map(fn (array $operation): array => DB::transaction(
                fn (): array => $this->processOperation($user, $operation),
            ))
            ->all();

        return response()->json(['data' => $results]);
    }

    /**
     * @param  array{id: string, type: string, title: string, description?: string|null, completed: bool, version: int}  $operation
     * @return array{id: string, operation: string, status: string, task: array<string, mixed>|null, message: string|null}
     */
    private function processOperation(User $user, array $operation): array
    {
        return match ($operation['type']) {
            'create' => $this->createTask($user, $operation),
            'update' => $this->updateTask($user, $operation),
            'delete' => $this->deleteTask($user, $operation),
            default => throw new InvalidArgumentException('Unsupported task synchronization operation.'),
        };
    }

    /**
     * @param  array{id: string, type: string, title: string, description?: string|null, completed: bool, version: int}  $operation
     * @return array{id: string, operation: string, status: string, task: array<string, mixed>|null, message: string|null}
     */
    private function createTask(User $user, array $operation): array
    {
        Gate::forUser($user)->authorize('create', Task::class);

        $existingTask = Task::query()
            ->withTrashed()
            ->whereKey($operation['id'])
            ->lockForUpdate()
            ->first();

        if ($existingTask !== null && ! $user->is($existingTask->user)) {
            return $this->result($operation, 'failed', null, 'Task could not be created.');
        }

        if ($existingTask !== null) {
            Gate::forUser($user)->authorize('view', $existingTask);

            return $this->result(
                $operation,
                $existingTask->trashed() ? 'conflict' : 'synced',
                $existingTask,
                $existingTask->trashed() ? 'This task was already deleted on the server.' : null,
            );
        }

        $task = $user->tasks()->create([
            'id' => $operation['id'],
            'title' => $operation['title'],
            'description' => $operation['description'] ?? null,
            'completed' => $operation['completed'],
            'version' => 1,
        ]);

        return $this->result($operation, 'synced', $task);
    }

    /**
     * @param  array{id: string, type: string, title: string, description?: string|null, completed: bool, version: int}  $operation
     * @return array{id: string, operation: string, status: string, task: array<string, mixed>|null, message: string|null}
     */
    private function updateTask(User $user, array $operation): array
    {
        $task = $this->findOwnedTaskForUpdate($user, $operation['id']);

        if ($task === null) {
            return $this->result($operation, 'conflict', null, 'This task no longer exists on the server.');
        }

        Gate::forUser($user)->authorize('update', $task);

        if ($task->trashed() || $task->version !== $operation['version']) {
            return $this->result($operation, 'conflict', $task, 'The server has a newer version of this task.');
        }

        $task->fill([
            'title' => $operation['title'],
            'description' => $operation['description'] ?? null,
            'completed' => $operation['completed'],
            'version' => $task->version + 1,
        ])->save();

        return $this->result($operation, 'synced', $task->refresh());
    }

    /**
     * @param  array{id: string, type: string, title: string, description?: string|null, completed: bool, version: int}  $operation
     * @return array{id: string, operation: string, status: string, task: array<string, mixed>|null, message: string|null}
     */
    private function deleteTask(User $user, array $operation): array
    {
        $task = $this->findOwnedTaskForUpdate($user, $operation['id']);

        if ($task === null) {
            return $this->result($operation, 'synced');
        }

        Gate::forUser($user)->authorize('delete', $task);

        if ($task->trashed()) {
            return $this->result($operation, 'synced', $task);
        }

        if ($task->version !== $operation['version']) {
            return $this->result($operation, 'conflict', $task, 'The server has a newer version of this task.');
        }

        $task->forceFill(['version' => $task->version + 1])->save();
        $task->delete();

        return $this->result($operation, 'synced', $task->refresh());
    }

    private function findOwnedTaskForUpdate(User $user, string $id): ?Task
    {
        return $user->tasks()
            ->withTrashed()
            ->whereKey($id)
            ->lockForUpdate()
            ->first();
    }

    /**
     * @param  array{id: string, type: string}  $operation
     * @return array{id: string, operation: string, status: string, task: array<string, mixed>|null, message: string|null}
     */
    private function result(
        array $operation,
        string $status,
        ?Task $task = null,
        ?string $message = null,
    ): array {
        return [
            'id' => $operation['id'],
            'operation' => $operation['type'],
            'status' => $status,
            'task' => $task === null ? null : TaskResource::make($task)->resolve(),
            'message' => $message,
        ];
    }
}
