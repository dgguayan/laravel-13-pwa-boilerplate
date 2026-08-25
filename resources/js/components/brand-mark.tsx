import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

type Props = {
    alt?: string;
    className?: string;
};

export function BrandMark({ alt = '', className }: Props) {
    const { branding } = usePage().props;

    if (branding.logoUrl) {
        return (
            <img
                src={branding.logoUrl}
                alt={alt}
                className={cn('object-contain', className)}
            />
        );
    }

    return <AppLogoIcon className={cn('fill-current', className)} />;
}
