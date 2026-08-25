<?php

use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\RolePermissionController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\TaskSyncController;
use App\Permission;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')
        ->middleware('can:'.Permission::ViewDashboard->value)
        ->name('dashboard');
    Route::inertia('tasks', 'tasks/index')
        ->middleware('can:'.Permission::ViewTasks->value)
        ->name('tasks.index');

    Route::prefix('api/tasks')
        ->middleware('can:'.Permission::ViewTasks->value)
        ->name('tasks.sync.')
        ->group(function () {
            Route::get('sync', [TaskSyncController::class, 'show'])->name('show');
            Route::post('sync', [TaskSyncController::class, 'store'])->name('store');
        });

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('users', [UserController::class, 'index'])
            ->middleware('can:'.Permission::ViewUsers->value)
            ->name('users.index');
        Route::post('users', [UserController::class, 'store'])
            ->middleware('can:'.Permission::CreateUsers->value)
            ->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])
            ->middleware('can:'.Permission::UpdateUsers->value)
            ->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])
            ->middleware('can:'.Permission::DeleteUsers->value)
            ->name('users.destroy');

        Route::get('roles', [RoleController::class, 'index'])
            ->middleware('can:'.Permission::ViewRoles->value)
            ->name('roles.index');
        Route::post('roles', [RoleController::class, 'store'])
            ->middleware('can:'.Permission::CreateRoles->value)
            ->name('roles.store');
        Route::put('roles/{role}', [RoleController::class, 'update'])
            ->middleware('can:'.Permission::UpdateRoles->value)
            ->name('roles.update');
        Route::put('roles/{role}/permissions', [RolePermissionController::class, 'update'])
            ->middleware('can:'.Permission::AssignPermissions->value)
            ->name('roles.permissions.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])
            ->middleware('can:'.Permission::DeleteRoles->value)
            ->name('roles.destroy');

    });
});

require __DIR__.'/settings.php';
