<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\BrandingService;
use App\Support\PermissionRegistry;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function __construct(private readonly BrandingService $branding) {}

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();
        $branding = $this->branding->publicSettings();

        return [
            ...parent::share($request),
            'name' => $branding['appName'],
            'branding' => $branding,
            'auth' => [
                'user' => $user,
                'roles' => $user?->getRoleNames()->sort()->values()->all() ?? [],
                'permissions' => $user?->getAllPermissions()->pluck('name')->sort()->values()->all() ?? [],
            ],
            'navigation' => $user === null ? [] : PermissionRegistry::navigationFor($user),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
