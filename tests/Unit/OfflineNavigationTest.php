<?php

test('offline route pages remain in the initial JavaScript module graph', function () {
    $source = file_get_contents(
        dirname(__DIR__, 2).'/resources/js/lib/offline-navigation.ts',
    );

    expect($source)
        ->toContain("import Dashboard from '@/pages/dashboard';")
        ->toContain("import TasksIndex from '@/pages/tasks/index';")
        ->toContain('page: Dashboard')
        ->toContain('page: TasksIndex');
});

test('the blade shell only requests vite entry points emitted in the manifest', function () {
    $source = file_get_contents(
        dirname(__DIR__, 2).'/resources/views/app.blade.php',
    );

    expect($source)
        ->toContain("@vite(['resources/css/app.css', 'resources/js/app.tsx'])")
        ->not->toContain('resources/js/pages/{$page[\'component\']}.tsx');
});
