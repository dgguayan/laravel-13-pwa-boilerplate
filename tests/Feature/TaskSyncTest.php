<?php

use App\Models\Task;
use App\Models\User;
use App\SystemRole;
use Database\Seeders\AuthorizationSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @param  array<string, mixed>  $overrides
 * @return array{id: string, type: string, title: string, description: string|null, completed: bool, version: int}
 */
function taskSyncOperation(array $overrides = []): array
{
    return array_replace([
        'id' => Str::uuid()->toString(),
        'type' => 'create',
        'title' => 'Offline task',
        'description' => 'Created without a network connection.',
        'completed' => false,
        'version' => 0,
    ], $overrides);
}

function taskAuthorizedUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(SystemRole::Member->value);

    return $user;
}

beforeEach(function () {
    $this->seed(AuthorizationSeeder::class);
});

test('guests cannot access the tasks page or synchronization endpoints', function () {
    $this->get(route('tasks.index'))->assertRedirect(route('login'));
    $this->getJson(route('tasks.sync.show'))->assertUnauthorized();
    $this->postJson(route('tasks.sync.store'), [
        'operations' => [taskSyncOperation()],
    ])->assertUnauthorized();
});

test('authenticated users can visit the offline tasks page', function () {
    $user = taskAuthorizedUser();

    $this->actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('tasks/index'));
});

test('pull synchronization returns only the authenticated users tasks and tombstones', function () {
    $user = taskAuthorizedUser();
    $activeTask = Task::factory()->for($user)->create();
    $deletedTask = Task::factory()->for($user)->create();
    $deletedTask->delete();
    $otherTask = Task::factory()->for(User::factory())->create();

    $this->actingAs($user)
        ->getJson(route('tasks.sync.show'))
        ->assertOk()
        ->assertCookie('XSRF-TOKEN')
        ->assertJsonCount(2, 'data')
        ->assertJsonFragment(['id' => $activeTask->id])
        ->assertJsonFragment(['id' => $deletedTask->id])
        ->assertJsonMissing(['id' => $otherTask->id]);
});

test('a client UUID task is created for the authenticated user at server version one', function () {
    $user = taskAuthorizedUser();
    $operation = taskSyncOperation(['version' => 999]);

    $this->actingAs($user)
        ->postJson(route('tasks.sync.store'), ['operations' => [$operation]])
        ->assertOk()
        ->assertJsonPath('data.0.status', 'synced')
        ->assertJsonPath('data.0.task.id', $operation['id'])
        ->assertJsonPath('data.0.task.version', 1);

    $this->assertDatabaseHas('tasks', [
        'id' => $operation['id'],
        'user_id' => $user->id,
        'title' => $operation['title'],
        'version' => 1,
    ]);
});

test('untrusted synchronization fields and invalid UUIDs are rejected', function () {
    $user = taskAuthorizedUser();
    $operation = taskSyncOperation([
        'id' => 'not-a-uuid',
        'user_id' => User::factory()->create()->id,
    ]);

    $this->actingAs($user)
        ->postJson(route('tasks.sync.store'), ['operations' => [$operation]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['operations.0', 'operations.0.id']);
});

test('a matching version update increments the authoritative version', function () {
    $user = taskAuthorizedUser();
    $task = Task::factory()->for($user)->create(['version' => 3]);
    $operation = taskSyncOperation([
        'id' => $task->id,
        'type' => 'update',
        'title' => 'Updated offline',
        'version' => 3,
    ]);

    $this->actingAs($user)
        ->postJson(route('tasks.sync.store'), ['operations' => [$operation]])
        ->assertOk()
        ->assertJsonPath('data.0.status', 'synced')
        ->assertJsonPath('data.0.task.version', 4);

    $this->assertDatabaseHas('tasks', [
        'id' => $task->id,
        'title' => 'Updated offline',
        'version' => 4,
    ]);
});

test('a stale update returns a conflict without overwriting the server', function () {
    $user = taskAuthorizedUser();
    $task = Task::factory()->for($user)->create([
        'title' => 'Server title',
        'version' => 4,
    ]);
    $operation = taskSyncOperation([
        'id' => $task->id,
        'type' => 'update',
        'title' => 'Stale local title',
        'version' => 3,
    ]);

    $this->actingAs($user)
        ->postJson(route('tasks.sync.store'), ['operations' => [$operation]])
        ->assertOk()
        ->assertJsonPath('data.0.status', 'conflict')
        ->assertJsonPath('data.0.task.title', 'Server title')
        ->assertJsonPath('data.0.task.version', 4);

    $this->assertDatabaseHas('tasks', [
        'id' => $task->id,
        'title' => 'Server title',
        'version' => 4,
    ]);
});

test('a matching delete creates a versioned server tombstone', function () {
    $user = taskAuthorizedUser();
    $task = Task::factory()->for($user)->create(['version' => 2]);
    $operation = taskSyncOperation([
        'id' => $task->id,
        'type' => 'delete',
        'title' => $task->title,
        'description' => $task->description,
        'completed' => $task->completed,
        'version' => 2,
    ]);

    $this->actingAs($user)
        ->postJson(route('tasks.sync.store'), ['operations' => [$operation]])
        ->assertOk()
        ->assertJsonPath('data.0.status', 'synced')
        ->assertJsonPath('data.0.task.version', 3)
        ->assertJsonPath('data.0.task.deleted_at', fn (mixed $deletedAt): bool => is_string($deletedAt));

    $this->assertSoftDeleted('tasks', [
        'id' => $task->id,
        'user_id' => $user->id,
        'version' => 3,
    ]);
});

test('a user cannot modify another users task', function () {
    $user = taskAuthorizedUser();
    $otherTask = Task::factory()->for(User::factory())->create([
        'title' => 'Protected task',
        'version' => 1,
    ]);
    $operation = taskSyncOperation([
        'id' => $otherTask->id,
        'type' => 'update',
        'title' => 'Tampered task',
        'version' => 1,
    ]);

    $this->actingAs($user)
        ->postJson(route('tasks.sync.store'), ['operations' => [$operation]])
        ->assertOk()
        ->assertJsonPath('data.0.status', 'conflict')
        ->assertJsonPath('data.0.task', null);

    $this->assertDatabaseHas('tasks', [
        'id' => $otherTask->id,
        'title' => 'Protected task',
        'version' => 1,
    ]);
});
