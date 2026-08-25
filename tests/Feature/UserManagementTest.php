<?php

use App\Models\User;
use App\Permission;
use App\SystemRole;
use Database\Seeders\AuthorizationSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(AuthorizationSeeder::class);
});

test('administrator can create a user and assign a role', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);
    $staff = Role::create(['name' => 'Staff', 'guard_name' => 'web']);

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Staff User',
            'email' => 'staff@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'is_active' => true,
            'roles' => [$staff->name],
        ])
        ->assertRedirect(route('admin.users.index'));

    $user = User::query()->where('email', 'staff@example.com')->firstOrFail();

    expect($user->hasRole($staff))->toBeTrue()
        ->and($user->email_verified_at)->not->toBeNull();
});

test('a delegated user cannot assign administrator access', function () {
    $managerRole = Role::create(['name' => 'Manager', 'guard_name' => 'web']);
    $managerRole->givePermissionTo([
        Permission::ViewUsers->value,
        Permission::UpdateUsers->value,
        Permission::AssignRoles->value,
    ]);
    $manager = User::factory()->create();
    $manager->assignRole($managerRole);
    $target = User::factory()->create();
    $target->assignRole(SystemRole::Member->value);

    $this->actingAs($manager)
        ->put(route('admin.users.update', $target), [
            'name' => $target->name,
            'email' => $target->email,
            'is_active' => true,
            'roles' => [SystemRole::Administrator->value],
        ])
        ->assertSessionHasErrors('roles');

    expect($target->refresh()->hasRole(SystemRole::Administrator->value))->toBeFalse();
});

test('the final active administrator cannot lose access be disabled or be deleted', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);

    $basePayload = [
        'name' => $admin->name,
        'email' => $admin->email,
        'is_active' => true,
    ];

    $this->actingAs($admin)
        ->put(route('admin.users.update', $admin), [
            ...$basePayload,
            'roles' => [SystemRole::Member->value],
        ])
        ->assertSessionHasErrors('roles');

    $this->actingAs($admin)
        ->put(route('admin.users.update', $admin), [
            ...$basePayload,
            'is_active' => false,
            'roles' => [SystemRole::Administrator->value],
        ])
        ->assertSessionHasErrors('user');

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $admin))
        ->assertSessionHasErrors('user');

    expect($admin->refresh()->is_active)->toBeTrue()
        ->and($admin->hasRole(SystemRole::Administrator->value))->toBeTrue();
});

test('disabled managed users cannot continue accessing protected pages', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);
    $member = User::factory()->create();
    $member->assignRole(SystemRole::Member->value);

    $this->actingAs($admin)
        ->put(route('admin.users.update', $member), [
            'name' => $member->name,
            'email' => $member->email,
            'is_active' => false,
            'roles' => [SystemRole::Member->value],
        ])
        ->assertRedirect(route('admin.users.index'));

    $this->actingAs($member->refresh())
        ->get(route('dashboard'))
        ->assertRedirect(route('login'));
});
