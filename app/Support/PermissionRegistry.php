<?php

namespace App\Support;

use App\Models\User;
use App\Permission;

class PermissionRegistry
{
    /** @return list<array{key: string, label: string, route: string, permission: Permission}> */
    public static function pages(): array
    {
        return [
            ['key' => 'dashboard', 'label' => 'Dashboard', 'route' => 'dashboard', 'permission' => Permission::ViewDashboard],
            ['key' => 'tasks', 'label' => 'Tasks', 'route' => 'tasks.index', 'permission' => Permission::ViewTasks],
            ['key' => 'users', 'label' => 'Users', 'route' => 'admin.users.index', 'permission' => Permission::ViewUsers],
            ['key' => 'roles', 'label' => 'Roles', 'route' => 'admin.roles.index', 'permission' => Permission::ViewRoles],
            ['key' => 'settings', 'label' => 'Settings', 'route' => 'appearance.edit', 'permission' => Permission::ViewSettings],
        ];
    }

    /**
     * @return list<array{key: string, label: string, permissions: list<array{name: string, label: string}>}>
     */
    public static function groups(): array
    {
        return [
            [
                'key' => 'pages',
                'label' => 'Page access',
                'permissions' => [
                    ['name' => Permission::ViewDashboard->value, 'label' => 'View Dashboard'],
                    ['name' => Permission::ViewTasks->value, 'label' => 'View Tasks'],
                    ['name' => Permission::ViewUsers->value, 'label' => 'View User Management'],
                    ['name' => Permission::ViewRoles->value, 'label' => 'View Role Management'],
                    ['name' => Permission::ViewSettings->value, 'label' => 'View Application Settings'],
                ],
            ],
            [
                'key' => 'tasks',
                'label' => 'Tasks',
                'permissions' => [
                    ['name' => Permission::CreateTasks->value, 'label' => 'Create tasks'],
                    ['name' => Permission::UpdateTasks->value, 'label' => 'Update tasks'],
                    ['name' => Permission::DeleteTasks->value, 'label' => 'Delete tasks'],
                ],
            ],
            [
                'key' => 'users',
                'label' => 'Users',
                'permissions' => [
                    ['name' => Permission::CreateUsers->value, 'label' => 'Create users'],
                    ['name' => Permission::UpdateUsers->value, 'label' => 'Update users and status'],
                    ['name' => Permission::DeleteUsers->value, 'label' => 'Delete users'],
                    ['name' => Permission::AssignRoles->value, 'label' => 'Assign roles'],
                    ['name' => Permission::AssignAdministrator->value, 'label' => 'Assign administrator access'],
                ],
            ],
            [
                'key' => 'roles',
                'label' => 'Roles',
                'permissions' => [
                    ['name' => Permission::CreateRoles->value, 'label' => 'Create roles'],
                    ['name' => Permission::UpdateRoles->value, 'label' => 'Rename roles'],
                    ['name' => Permission::DeleteRoles->value, 'label' => 'Delete unused roles'],
                    ['name' => Permission::AssignPermissions->value, 'label' => 'Assign permissions'],
                ],
            ],
            [
                'key' => 'settings',
                'label' => 'Application settings',
                'permissions' => [
                    ['name' => Permission::ManageBranding->value, 'label' => 'Manage branding'],
                ],
            ],
        ];
    }

    /** @return list<string> */
    public static function names(): array
    {
        return array_map(
            static fn (Permission $permission): string => $permission->value,
            Permission::cases(),
        );
    }

    /** @return list<string> */
    public static function criticalNames(): array
    {
        return [
            Permission::AssignAdministrator->value,
            Permission::AssignPermissions->value,
            Permission::DeleteUsers->value,
            Permission::DeleteRoles->value,
            Permission::ManageBranding->value,
        ];
    }

    /** @return list<array{key: string, title: string, href: string, permission: string}> */
    public static function navigationFor(User $user): array
    {
        $navigation = collect(self::pages())
            ->filter(fn (array $page): bool => $user->can($page['permission']->value))
            ->map(fn (array $page): array => [
                'key' => $page['key'],
                'title' => $page['label'],
                'href' => route($page['route'], absolute: false),
                'permission' => $page['permission']->value,
            ])
            ->values()
            ->all();

        return array_values($navigation);
    }
}
