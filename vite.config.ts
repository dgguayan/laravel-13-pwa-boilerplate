import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        VitePWA({
            outDir: 'public',
            base: '/',
            buildBase: '/',
            scope: '/',
            injectRegister: false,
            registerType: 'prompt',
            includeAssets: [
                'favicon.ico',
                'favicon.svg',
                'apple-touch-icon.png',
                'pwa-192x192.png',
                'pwa-512x512.png',
            ],
            manifest: {
                name: 'Offline Tasks',
                short_name: 'Tasks',
                description: 'Offline-first task management with Laravel.',
                start_url: '/tasks',
                scope: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#0f172a',
                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                navigateFallback: undefined,
                globPatterns: [
                    'build/assets/**/*.{js,css,woff,woff2,png,svg}',
                    'favicon.{ico,svg}',
                    'apple-touch-icon.png',
                    'pwa-*.png',
                ],
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
                runtimeCaching: [
                    {
                        urlPattern: ({ request, url }) =>
                            (request.mode === 'navigate' ||
                                request.headers.get('X-PWA-Cache') === '1') &&
                            url.origin === self.location.origin &&
                            ['/dashboard', '/tasks'].includes(url.pathname),
                        handler: 'NetworkFirst',
                        method: 'GET',
                        options: {
                            cacheName: 'inertia-pages',
                            networkTimeoutSeconds: 3,
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 7 * 24 * 60 * 60,
                            },
                        },
                    },
                ],
            },
        }),
        {
            name: 'copy-pwa-manifest-to-public-root',
            apply: 'build',
            closeBundle() {
                copyFileSync(
                    resolve('public/build/manifest.webmanifest'),
                    resolve('public/manifest.webmanifest'),
                );
            },
        },
    ],
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
});
