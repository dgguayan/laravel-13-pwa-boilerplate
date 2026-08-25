<?php

use App\Models\ApplicationSetting;
use App\Models\User;
use App\SystemRole;
use Database\Seeders\AuthorizationSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(AuthorizationSeeder::class);
    Storage::fake('public');
});

test('logo upload is administrator only', function () {
    $member = User::factory()->create();
    $member->assignRole(SystemRole::Member->value);

    $this->actingAs($member)
        ->post(route('appearance.branding.update'), [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ])
        ->assertForbidden();

    expect(ApplicationSetting::query()->where('key', 'logo_path')->exists())->toBeFalse();
});

test('administrator sees application branding on the appearance page', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);

    $this->actingAs($admin)
        ->get(route('appearance.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/appearance')
            ->where('canManageBranding', true)
            ->has('currentBranding.appName')
            ->has('currentBranding.logoUrl'));
});

test('administrator can upload and replace a validated logo', function () {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);

    $this->actingAs($admin)
        ->post(route('appearance.branding.update'), [
            'logo' => UploadedFile::fake()->image('first.png', 320, 160),
        ])
        ->assertRedirect(route('appearance.edit'));

    $firstPath = ApplicationSetting::query()->where('key', 'logo_path')->value('value');
    Storage::disk('public')->assertExists($firstPath);

    $this->actingAs($admin)
        ->post(route('appearance.branding.update'), [
            'logo' => UploadedFile::fake()->image('replacement.webp', 320, 160),
        ])
        ->assertRedirect(route('appearance.edit'));

    $replacementPath = ApplicationSetting::query()->where('key', 'logo_path')->value('value');

    expect($replacementPath)->not->toBe($firstPath);
    Storage::disk('public')->assertMissing($firstPath);
    Storage::disk('public')->assertExists($replacementPath);
});

test('invalid and oversized logo uploads are rejected', function (UploadedFile $file) {
    $admin = User::factory()->create();
    $admin->assignRole(SystemRole::Administrator->value);

    $this->actingAs($admin)
        ->post(route('appearance.branding.update'), ['logo' => $file])
        ->assertSessionHasErrors('logo');

    expect(ApplicationSetting::query()->where('key', 'logo_path')->exists())->toBeFalse();
})->with([
    'non image' => fn () => UploadedFile::fake()->create('logo.txt', 20, 'text/plain'),
    'oversized image' => fn () => UploadedFile::fake()->image('logo.png')->size(2049),
]);
