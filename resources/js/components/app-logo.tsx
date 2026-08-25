import { usePage } from '@inertiajs/react';

import { BrandMark } from '@/components/brand-mark';

export default function AppLogo() {
    const { branding } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <BrandMark className="size-6 text-white dark:text-black" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {branding.appName}
                </span>
            </div>
        </>
    );
}
