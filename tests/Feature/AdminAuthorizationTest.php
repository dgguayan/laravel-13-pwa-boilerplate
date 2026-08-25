<?php

use App\Models\User;
use App\Permission;
use App\SystemRole;
use Database\Seeders\AuthorizationSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(AuthorizationSeeder::class);
});

test('ordinary members cannot access administrative pages by typing their urls', function () {
    $member = User::factory()->create();
    $member->assignRole(SystemRole::Member->value);

    $this->actingAs($member)->get(route('admin.users.index'))->assertForbidden();
    $this->actingAs($member)->get(route('admin.roles.index'))->assertForbidden();
});

test('members can change personal appearance without seeing application branding controls', function () {
    $member = User::factory()->create();
    $member->assignRole(SystemRole::Member->value);

    $this->actingAs($member)
        ->get(route('appearance.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/appearance')
            ->where('canManageBranding', false));
});

test('page access is denied and granted by the database backed permission', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole($role);

    $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();

    $role->givePermissionTo(Permission::ViewUsers->value);

    $this->actingAs($user)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/users/index'));
});

test('shared navigation and auth capabilities reflect server authorized access', function () {
    $member = User::factory()->create();
    $member->assignRole(SystemRole::Member->value);

    $this->actingAs($member)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.roles.0', SystemRole::Member->value)
            ->where('auth.permissions', fn ($permissions): bool => $permissions->contains(Permission::ViewTasks->value))
            ->where('navigation', fn ($navigation): bool => $navigation->pluck('key')->all() === ['dashboard', 'tasks']));
});

test('disabled users are logged out before protected pages are served', function () {
    $member = User::factory()->create();
    $member->assignRole(SystemRole::Member->value);
    $member->update(['is_active' => false]);

    $this->actingAs($member)
        ->get(route('dashboard'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});
