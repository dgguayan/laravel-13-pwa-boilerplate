import { WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function AdminOnlineBoundary({ children }: { children: ReactNode }) {
    const online = useOnlineStatus();

    if (online) {
        return children;
    }

    return (
        <Alert>
            <WifiOff />
            <AlertTitle>Connection required</AlertTitle>
            <AlertDescription>
                Administrative data and changes are online-only. Reconnect to
                continue.
            </AlertDescription>
        </Alert>
    );
}
