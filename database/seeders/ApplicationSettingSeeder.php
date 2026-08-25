<?php

namespace Database\Seeders;

use App\Models\ApplicationSetting;
use Illuminate\Database\Seeder;

class ApplicationSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ApplicationSetting::query()->firstOrCreate(
            ['key' => 'app_name'],
            ['value' => config('app.name'), 'type' => 'string'],
        );
    }
}
