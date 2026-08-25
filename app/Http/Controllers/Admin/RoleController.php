<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use App\Permission;
use App\Services\AdministratorProtection;
use App\Support\PermissionRegistry;
use App\SystemRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(private readonly AdministratorProtection $protection) {}

    public function index(Request $request): Response
    {
        $actor = $request->user();
        $roles = Role::query()
            ->with('permissions:id,name')
            ->withCount(['users', 'permissions'])
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
                'users_count' => $role->users_count,
                'permissions_count' => $role->permissions_count,
                'permissions' => $role->permissions->pluck('name')->sort()->values()->all(),
                'protected' => in_array($role->name, [SystemRole::Administrator->value, SystemRole::Member->value], true),
                'permissions_locked' => $role->name === SystemRole::Administrator->value,
            ]);

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'permissionGroups' => PermissionRegistry::groups(),
            'criticalPermissions' => PermissionRegistry::criticalNames(),
            'capabilities' => [
                'create' => $actor->can(Permission::CreateRoles->value),
                'update' => $actor->can(Permission::UpdateRoles->value),
                'delete' => $actor->can(Permission::DeleteRoles->value),
                'assignPermissions' => $actor->can(Permission::AssignPermissions->value),
                'assignCriticalPermissions' => $actor->can(Permission::AssignAdministrator->value),
            ],
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $name = $request->validated('name');
        $this->protection->ensureRoleNameMayBeCreated($name);

        $role = Role::query()->create(['name' => $name, 'guard_name' => 'web']);

        Log::info('Role created.', [
            'actor_id' => $request->user()->id,
            'role_id' => $role->id,
            'role_name' => $role->name,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role created.')]);

        return to_route('admin.roles.index');
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $this->protection->ensureRoleMayBeRenamedOrDeleted($role);
        $this->protection->ensureRoleNameMayBeCreated($request->validated('name'));

        $oldName = $role->name;
        $role->update(['name' => $request->validated('name')]);

        Log::info('Role renamed.', [
            'actor_id' => $request->user()->id,
            'role_id' => $role->id,
            'old_name' => $oldName,
            'new_name' => $role->name,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role renamed.')]);

        return to_route('admin.roles.index');
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        abort_unless($request->user()->can(Permission::DeleteRoles->value), 403);

        $this->protection->ensureRoleMayBeDeleted($role);

        $roleName = $role->name;
        $role->delete();

        Log::warning('Role deleted.', [
            'actor_id' => $request->user()->id,
            'role_name' => $roleName,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role deleted.')]);

        return to_route('admin.roles.index');
    }
}
