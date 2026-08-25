<?php

use App\Models\User;
use App\SystemRole;
use Database\Seeders\AuthorizationSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(AuthorizationSeeder::class);
});

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $user->assignRole(SystemRole::Member->value);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard'));
});
