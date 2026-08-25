<?php

namespace App\Services;

use App\Models\User;
use App\Permission;
use App\Support\PermissionRegistry;
use App\SystemRole;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AdministratorProtection
{
    /** @param list<string> $roleNames */
    public function ensureRolesMayBeAssigned(User $actor, ?User $target, array $roleNames): void
    {
        $touchesAdministrator = in_array(SystemRole::Administrator->value, $roleNames, true)
            || $target?->hasRole(SystemRole::Administrator->value) === true;

        if ($touchesAdministrator && ! $actor->can(Permission::AssignAdministrator->value)) {
            throw ValidationException::withMessages([
                'roles' => __('You are not allowed to assign or change administrator access.'),
            ]);
        }

        if (
            $target?->is_active === true
            && $target->hasRole(SystemRole::Administrator->value)
            && ! in_array(SystemRole::Administrator->value, $roleNames, true)
            && $this->activeAdministratorCount() <= 1
        ) {
            throw ValidationException::withMessages([
                'roles' => __('The final active administrator must keep the Administrator role.'),
            ]);
        }
    }

    public function ensureUserMayBeDisabledOrDeleted(User $actor, User $target): void
    {
        if ($actor->is($target)) {
            throw ValidationException::withMessages([
                'user' => __('You cannot disable or delete your own account here.'),
            ]);
        }

        if (
            $target->is_active
            && $target->hasRole(SystemRole::Administrator->value)
            && $this->activeAdministratorCount() <= 1
        ) {
            throw ValidationException::withMessages([
                'user' => __('The final active administrator cannot be disabled or deleted.'),
            ]);
        }
    }

    public function ensureUserMayBeManaged(User $actor, User $target): void
    {
        if (
            $target->hasRole(SystemRole::Administrator->value)
            && ! $actor->can(Permission::AssignAdministrator->value)
        ) {
            throw ValidationException::withMessages([
                'user' => __('Only an administrator may manage an administrator account.'),
            ]);
        }
    }

    public function ensureRoleNameMayBeCreated(string $name): void
    {
        foreach (SystemRole::cases() as $systemRole) {
            if (strcasecmp($name, $systemRole->value) === 0) {
                throw ValidationException::withMessages([
                    'name' => __('That role name is reserved by the system.'),
                ]);
            }
        }
    }

    public function ensureRoleMayBeRenamedOrDeleted(Role $role): void
    {
        if (in_array($role->name, [SystemRole::Administrator->value, SystemRole::Member->value], true)) {
            throw ValidationException::withMessages([
                'role' => __('This system role cannot be renamed or deleted.'),
            ]);
        }
    }

    public function ensureRolePermissionsMayBeChanged(Role $role): void
    {
        if ($role->name === SystemRole::Administrator->value) {
            throw ValidationException::withMessages([
                'permissions' => __('The Administrator role always keeps every registered permission.'),
            ]);
        }
    }

    /** @param list<string> $permissionNames */
    public function ensurePermissionsMayBeAssigned(User $actor, Role $role, array $permissionNames): void
    {
        $this->ensureRolePermissionsMayBeChanged($role);

        $existing = $role->permissions()->pluck('name')->all();
        $changed = array_merge(
            array_diff($existing, $permissionNames),
            array_diff($permissionNames, $existing),
        );

        if (
            array_intersect($changed, PermissionRegistry::criticalNames()) !== []
            && ! $actor->can(Permission::AssignAdministrator->value)
        ) {
            throw ValidationException::withMessages([
                'permissions' => __('Only an administrator may change critical permissions.'),
            ]);
        }
    }

    public function ensureRoleMayBeDeleted(Role $role): void
    {
        $this->ensureRoleMayBeRenamedOrDeleted($role);

        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => __('Remove this role from all users before deleting it.'),
            ]);
        }
    }

    private function activeAdministratorCount(): int
    {
        return User::query()
            ->role(SystemRole::Administrator->value)
            ->where('is_active', true)
            ->count();
    }
}
