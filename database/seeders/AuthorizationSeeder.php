<?php

namespace Database\Seeders;

use App\Models\User;
use App\Permission;
use App\Support\PermissionRegistry;
use App\SystemRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission as PermissionModel;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AuthorizationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (Permission::cases() as $permission) {
            PermissionModel::findOrCreate($permission->value, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $member = Role::findOrCreate(SystemRole::Member->value, 'web');
        $member->syncPermissions([
            Permission::ViewDashboard->value,
            Permission::ViewTasks->value,
            Permission::CreateTasks->value,
            Permission::UpdateTasks->value,
            Permission::DeleteTasks->value,
        ]);

        $administrator = Role::findOrCreate(SystemRole::Administrator->value, 'web');
        $administrator->syncPermissions(PermissionRegistry::names());

        User::query()->doesntHave('roles')->eachById(
            fn (User $user) => $user->assignRole($member),
        );

        $adminEmail = config('authorization.initial_admin_email');

        if (filled($adminEmail)) {
            User::query()
                ->where('email', $adminEmail)
                ->first()
                ?->assignRole($administrator);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
