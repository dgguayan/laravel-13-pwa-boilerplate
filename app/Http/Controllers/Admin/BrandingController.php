<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateBrandingRequest;
use App\Permission;
use App\Services\BrandingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class BrandingController extends Controller
{
    public function __construct(private readonly BrandingService $branding) {}

    public function edit(Request $request): Response
    {
        return Inertia::render('settings/appearance', [
            'currentBranding' => $this->branding->publicSettings(),
            'canManageBranding' => $request->user()->can(Permission::ManageBranding->value),
        ]);
    }

    public function update(UpdateBrandingRequest $request): RedirectResponse
    {
        $oldPath = $this->branding->logoPath();
        $newPath = $request->file('logo')->store('branding', 'public');

        if ($newPath === false) {
            throw ValidationException::withMessages([
                'logo' => __('The logo could not be stored.'),
            ]);
        }

        try {
            $this->branding->setLogoPath($newPath);
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($newPath);

            throw $exception;
        }

        if (filled($oldPath) && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        Log::info('Application logo changed.', [
            'actor_id' => $request->user()->id,
            'old_path' => $oldPath,
            'new_path' => $newPath,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Logo updated.')]);

        return to_route('appearance.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->user()->can(Permission::ManageBranding->value) || abort(403);

        $oldPath = $this->branding->logoPath();
        $this->branding->setLogoPath(null);

        if (filled($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        Log::info('Application logo reset.', [
            'actor_id' => $request->user()->id,
            'old_path' => $oldPath,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Default logo restored.')]);

        return to_route('appearance.edit');
    }
}
