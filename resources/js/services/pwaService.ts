const offlinePageCacheName = 'inertia-pages';

export async function warmOfflinePages(
    urls: string[],
    signal?: AbortSignal,
): Promise<void> {
    if (
        !('serviceWorker' in navigator) ||
        !navigator.onLine ||
        import.meta.env.DEV
    ) {
        return;
    }

    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => resolve(),
                { once: true },
            );
        });
    }

    if (!navigator.onLine) {
        return;
    }

    await Promise.allSettled(
        urls.map((url) =>
            fetch(url, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'text/html',
                    'X-PWA-Cache': '1',
                },
                redirect: 'error',
                signal,
            }),
        ),
    );
}

export async function clearOfflinePageCache(): Promise<void> {
    if (!('caches' in window)) {
        return;
    }

    await caches.delete(offlinePageCacheName);
}
