import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { BrandingSettings } from '@/components/branding-settings';
import Heading from '@/components/heading';
import { edit as editAppearance } from '@/routes/appearance';
import type { Branding } from '@/types';

export default function Appearance({
    currentBranding,
    canManageBranding,
}: {
    currentBranding: Branding;
    canManageBranding: boolean;
}) {
    return (
        <>
            <Head title="Appearance settings" />

            <h1 className="sr-only">Appearance settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Appearance settings"
                    description="Update the appearance settings for your account"
                />
                <AppearanceTabs />
            </div>

            {canManageBranding && (
                <BrandingSettings currentBranding={currentBranding} />
            )}
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
