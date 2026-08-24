import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { forwardRef } from 'react';
import type {
    ComponentPropsWithoutRef,
    MouseEvent,
    ReactNode,
    Ref,
} from 'react';
import {
    findOfflineRoute,
    navigateOfflineRoute,
} from '@/lib/offline-navigation';
import { toUrl } from '@/lib/utils';

type OfflineLinkProps = Omit<
    ComponentPropsWithoutRef<'a'>,
    'children' | 'href' | 'onError' | 'onProgress'
> & {
    children: ReactNode;
    href: NonNullable<InertiaLinkProps['href']>;
    prefetch?: InertiaLinkProps['prefetch'];
};

function shouldHandleClick(event: MouseEvent<HTMLAnchorElement>): boolean {
    return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.currentTarget.target !== '_blank' &&
        !event.currentTarget.hasAttribute('download')
    );
}

export const OfflineLink = forwardRef<HTMLAnchorElement, OfflineLinkProps>(
    function OfflineLink({ children, href, onClick, prefetch, ...props }, ref) {
        if (findOfflineRoute(href) === null) {
            return (
                <Link
                    {...props}
                    href={href}
                    onClick={onClick as InertiaLinkProps['onClick']}
                    prefetch={prefetch}
                    ref={ref as Ref<unknown>}
                >
                    {children}
                </Link>
            );
        }

        function handleClick(event: MouseEvent<HTMLAnchorElement>) {
            onClick?.(event);

            if (!shouldHandleClick(event)) {
                return;
            }

            event.preventDefault();
            navigateOfflineRoute(href);
        }

        return (
            <a {...props} href={toUrl(href)} onClick={handleClick} ref={ref}>
                {children}
            </a>
        );
    },
);
