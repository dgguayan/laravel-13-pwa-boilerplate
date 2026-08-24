<?php

use App\Http\Controllers\TaskSyncController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('tasks', 'tasks/index')->name('tasks.index');

    Route::prefix('api/tasks')->name('tasks.sync.')->group(function () {
        Route::get('sync', [TaskSyncController::class, 'show'])->name('show');
        Route::post('sync', [TaskSyncController::class, 'store'])->name('store');
    });
});

require __DIR__.'/settings.php';
