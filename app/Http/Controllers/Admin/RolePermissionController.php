<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateRolePermissionsRequest;
use App\Services\AdministratorProtection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    public function __construct(private readonly AdministratorProtection $protection) {}

    public function update(UpdateRolePermissionsRequest $request, Role $role): RedirectResponse
    {
        $permissions = $request->validated('permissions');

        $this->protection->ensurePermissionsMayBeAssigned($request->user(), $role, $permissions);

        $role->syncPermissions($permissions);

        Log::info('Role permissions changed.', [
            'actor_id' => $request->user()->id,
            'role_id' => $role->id,
            'role_name' => $role->name,
            'permissions' => $permissions,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role permissions updated.')]);

        return to_route('admin.roles.index');
    }
}
