import { useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
    offlineRouteUrls,
    preloadOfflineRouteComponents,
} from '@/lib/offline-navigation';
import { warmOfflinePages } from '@/services/pwaService';

export function OfflineRouteCache() {
    const online = useOnlineStatus();

    useEffect(() => {
        if (!online) {
            return;
        }

        const controller = new AbortController();

        void preloadOfflineRouteComponents();
        void warmOfflinePages(offlineRouteUrls, controller.signal);

        return () => controller.abort();
    }, [online]);

    return null;
}
