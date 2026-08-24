import type { InertiaLinkProps } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as tasksIndex } from '@/routes/tasks';

type OfflineRoute = {
    component: string;
    url: string;
};

const offlineRoutes: OfflineRoute[] = [
    {
        component: 'dashboard',
        url: dashboard.url(),
    },
    {
        component: 'tasks/index',
        url: tasksIndex.url(),
    },
];

export const offlineRouteUrls = offlineRoutes.map((route) => route.url);

function normalizeUrl(url: string): string | null {
    const baseUrl =
        typeof window === 'undefined'
            ? 'http://localhost'
            : window.location.origin;
    const parsedUrl = new URL(url, baseUrl);

    if (parsedUrl.origin !== baseUrl) {
        return null;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
}

export function findOfflineRoute(
    href: NonNullable<InertiaLinkProps['href']>,
): OfflineRoute | null {
    const targetUrl = normalizeUrl(toUrl(href));

    if (targetUrl === null) {
        return null;
    }

    const targetPath = new URL(targetUrl, 'http://localhost').pathname;

    return offlineRoutes.find((route) => route.url === targetPath) ?? null;
}

export function navigateOfflineRoute(
    href: NonNullable<InertiaLinkProps['href']>,
): boolean {
    const route = findOfflineRoute(href);
    const targetUrl = normalizeUrl(toUrl(href));

    if (route === null || targetUrl === null) {
        return false;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (currentUrl === targetUrl) {
        return true;
    }

    router.push({
        component: route.component,
        url: targetUrl,
    });

    return true;
}
