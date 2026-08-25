<?php

use App\Models\User;
use App\Permission;
use App\SystemRole;
use Database\Seeders\AuthorizationSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(AuthorizationSeeder::class);
});

test('administrator can create a role and assign page permissions', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);

    $this->actingAs($admin)
        ->post(route('admin.roles.store'), ['name' => 'Staff'])
        ->assertRedirect(route('admin.roles.index'));

    $role = Role::findByName('Staff');

    $this->actingAs($admin)
        ->put(route('admin.roles.permissions.update', $role), [
            'permissions' => [Permission::ViewDashboard->value, Permission::ViewTasks->value],
        ])
        ->assertRedirect(route('admin.roles.index'));

    expect($role->fresh()->hasPermissionTo(Permission::ViewDashboard->value))->toBeTrue()
        ->and($role->fresh()->hasPermissionTo(Permission::ViewTasks->value))->toBeTrue();
});

test('role permission changes are enforced without code changes', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);
    $staff = Role::create(['name' => 'Staff', 'guard_name' => 'web']);
    $staff->givePermissionTo(Permission::ViewDashboard->value);
    $user = User::factory()->create();
    $user->assignRole($staff);

    $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();

    $this->actingAs($admin)
        ->put(route('admin.roles.permissions.update', $staff), [
            'permissions' => [Permission::ViewDashboard->value, Permission::ViewUsers->value],
        ])
        ->assertRedirect(route('admin.roles.index'));

    $this->actingAs($user)->get(route('admin.users.index'))->assertOk();

    $this->actingAs($admin)
        ->put(route('admin.roles.permissions.update', $staff), [
            'permissions' => [Permission::ViewDashboard->value],
        ])
        ->assertRedirect(route('admin.roles.index'));

    $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
});

test('protected roles and roles assigned to users cannot be deleted', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);
    $staff = Role::create(['name' => 'Staff', 'guard_name' => 'web']);
    User::factory()->create()->assignRole($staff);

    $this->actingAs($admin)
        ->delete(route('admin.roles.destroy', $staff))
        ->assertSessionHasErrors('role');

    $administratorRole = Role::findByName(SystemRole::Administrator->value);

    $this->actingAs($admin)
        ->delete(route('admin.roles.destroy', $administratorRole))
        ->assertSessionHasErrors('role');

    expect(Role::findByName('Staff'))->toBeInstanceOf(Role::class)
        ->and(Role::findByName(SystemRole::Administrator->value))->toBeInstanceOf(Role::class);
});
