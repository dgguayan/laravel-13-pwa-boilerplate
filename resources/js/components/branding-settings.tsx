import { Form } from '@inertiajs/react';
import { ImageUp, RotateCcw } from 'lucide-react';
import {
    destroy,
    update,
} from '@/actions/App/Http/Controllers/Admin/BrandingController';
import { AdminOnlineBoundary } from '@/components/admin-online-boundary';
import { BrandMark } from '@/components/brand-mark';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Branding } from '@/types';

export function BrandingSettings({
    currentBranding,
}: {
    currentBranding: Branding;
}) {
    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title="Application branding"
                description="Upload the logo used throughout the application."
            />

            <AdminOnlineBoundary>
                <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current logo</CardTitle>
                            <CardDescription>
                                {currentBranding.logoUrl
                                    ? 'Custom logo'
                                    : 'Application default'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted/30 p-6">
                                <BrandMark
                                    alt={`${currentBranding.appName} logo`}
                                    className="max-h-full max-w-full text-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Upload logo</CardTitle>
                            <CardDescription>
                                PNG, JPEG, or WebP. Maximum size 2 MB. SVG is
                                excluded to avoid active-content risks.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <Form
                                {...update.form()}
                                className="space-y-4"
                                encType="multipart/form-data"
                                resetOnSuccess
                                validateFiles
                            >
                                {({ errors, processing, progress }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="logo">
                                                New logo
                                            </Label>
                                            <Input
                                                id="logo"
                                                name="logo"
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                                required
                                            />
                                            <InputError message={errors.logo} />
                                            {progress && (
                                                <p className="text-sm text-muted-foreground">
                                                    Uploading{' '}
                                                    {progress.percentage}%
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            <ImageUp />
                                            {processing
                                                ? 'Uploading…'
                                                : 'Update logo'}
                                        </Button>
                                    </>
                                )}
                            </Form>

                            {currentBranding.logoUrl && (
                                <Form
                                    {...destroy.form()}
                                    onBefore={() =>
                                        window.confirm(
                                            'Restore the default application logo?',
                                        )
                                    }
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            disabled={processing}
                                        >
                                            <RotateCcw />
                                            Restore default
                                        </Button>
                                    )}
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </AdminOnlineBoundary>
        </div>
    );
}
