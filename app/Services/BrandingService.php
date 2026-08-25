<?php

namespace App\Services;

use App\Models\ApplicationSetting;
use Illuminate\Support\Facades\Cache;

class BrandingService
{
    private const CACHE_KEY = 'application.branding.public';

    private const LOGO_PATH_KEY = 'logo_path';

    private const APP_NAME_KEY = 'app_name';

    /** @return array{appName: string, logoUrl: string|null} */
    public function publicSettings(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function (): array {
            $settings = ApplicationSetting::query()
                ->whereIn('key', [self::APP_NAME_KEY, self::LOGO_PATH_KEY])
                ->pluck('value', 'key');

            $logoPath = $settings->get(self::LOGO_PATH_KEY);

            return [
                'appName' => $settings->get(self::APP_NAME_KEY) ?: config('app.name'),
                'logoUrl' => filled($logoPath) ? '/storage/'.ltrim((string) $logoPath, '/') : null,
            ];
        });
    }

    public function logoPath(): ?string
    {
        return ApplicationSetting::query()
            ->where('key', self::LOGO_PATH_KEY)
            ->value('value');
    }

    public function setLogoPath(?string $path): void
    {
        ApplicationSetting::query()->updateOrCreate(
            ['key' => self::LOGO_PATH_KEY],
            ['value' => $path, 'type' => 'string'],
        );

        Cache::forget(self::CACHE_KEY);
    }
}
