<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Permission;
use App\Services\AdministratorProtection;
use App\SystemRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function __construct(private readonly AdministratorProtection $protection) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $actor = $request->user();

        $users = User::query()
            ->with('roles:id,name')
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->latest()
            ->paginate(config('authorization.users_per_page'))
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at?->toISOString(),
                'is_active' => $user->is_active,
                'roles' => $user->roles->pluck('name')->sort()->values()->all(),
                'created_at' => $user->created_at?->toISOString(),
            ]);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->when(
                ! $actor->can(Permission::AssignAdministrator->value),
                fn (Builder $query) => $query->where('name', '!=', SystemRole::Administrator->value),
            )
            ->orderBy('name')
            ->pluck('name')
            ->all();

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'roles' => $roles,
            'filters' => ['search' => $search],
            'capabilities' => [
                'create' => $actor->can(Permission::CreateUsers->value),
                'update' => $actor->can(Permission::UpdateUsers->value),
                'delete' => $actor->can(Permission::DeleteUsers->value),
                'assignRoles' => $actor->can(Permission::AssignRoles->value),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $roleNames = $validated['roles'] ?? [SystemRole::Member->value];

        $this->protection->ensureRolesMayBeAssigned($request->user(), null, $roleNames);

        $user = DB::transaction(function () use ($validated, $roleNames): User {
            $user = User::query()->create([
                ...Arr::only($validated, ['name', 'email', 'password']),
                'email_verified_at' => now(),
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $user->syncRoles($roleNames);

            return $user;
        });

        Log::info('Managed user created.', [
            'actor_id' => $request->user()->id,
            'user_id' => $user->id,
            'roles' => $roleNames,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User created.')]);

        return to_route('admin.users.index');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        $this->protection->ensureUserMayBeManaged($request->user(), $user);

        if ($user->is_active && ! $validated['is_active']) {
            $this->protection->ensureUserMayBeDisabledOrDeleted($request->user(), $user);
        }

        if (array_key_exists('roles', $validated)) {
            $this->protection->ensureRolesMayBeAssigned($request->user(), $user, $validated['roles']);
        }

        DB::transaction(function () use ($user, $validated): void {
            $attributes = Arr::only($validated, ['name', 'email', 'is_active']);

            if (filled($validated['password'] ?? null)) {
                $attributes['password'] = $validated['password'];
            }

            $user->fill($attributes)->save();

            if (array_key_exists('roles', $validated)) {
                $user->syncRoles($validated['roles']);
            }
        });

        Log::info('Managed user updated.', [
            'actor_id' => $request->user()->id,
            'user_id' => $user->id,
            'is_active' => $user->is_active,
            'roles' => $user->getRoleNames()->all(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User updated.')]);

        return to_route('admin.users.index');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->can(Permission::DeleteUsers->value), 403);

        $this->protection->ensureUserMayBeManaged($request->user(), $user);
        $this->protection->ensureUserMayBeDisabledOrDeleted($request->user(), $user);

        $userId = $user->id;
        $user->delete();

        Log::warning('Managed user deleted.', [
            'actor_id' => $request->user()->id,
            'user_id' => $userId,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User deleted.')]);

        return to_route('admin.users.index');
    }
}
