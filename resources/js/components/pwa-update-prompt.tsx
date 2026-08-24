import { RefreshCw, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        offlineReady: [offlineReady, setOfflineReady],
        updateServiceWorker,
    } = useRegisterSW({ immediate: true });

    if (!needRefresh && !offlineReady) {
        return null;
    }

    return (
        <div className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border bg-background p-4 shadow-lg">
            {needRefresh ? (
                <RefreshCw className="size-4 shrink-0" />
            ) : (
                <WifiOff className="size-4 shrink-0" />
            )}

            <div className="flex-1 text-sm">
                <p className="text-center font-medium">
                    {needRefresh
                        ? 'An app update is available'
                        : 'The app is ready to work offline'}
                </p>

                {needRefresh && (
                    <Button
                        className="mt-3"
                        onClick={() => void updateServiceWorker(true)}
                        size="sm"
                    >
                        Update and reload
                    </Button>
                )}
            </div>

            <Button
                aria-label="Dismiss"
                onClick={() => {
                    setNeedRefresh(false);
                    setOfflineReady(false);
                }}
                size="icon"
                variant="ghost"
            >
                <X />
            </Button>
        </div>
    );
}
