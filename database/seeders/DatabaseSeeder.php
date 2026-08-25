<?php

namespace Database\Seeders;

use App\Models\User;
use App\SystemRole;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AuthorizationSeeder::class,
            ApplicationSettingSeeder::class,
        ]);

        $user = User::query()->where('email', 'test@example.com')->first();

        if ($user === null) {
            $user = User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }

        $user->syncRoles([SystemRole::Administrator->value]);

        $this->call(TaskSeeder::class);
    }
}
