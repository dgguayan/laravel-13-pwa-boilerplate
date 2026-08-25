import { Form, Head } from '@inertiajs/react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/Admin/RoleController';
import { update as updatePermissions } from '@/actions/App/Http/Controllers/Admin/RolePermissionController';
import { AdminOnlineBoundary } from '@/components/admin-online-boundary';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Role = {
    id: number;
    name: string;
    users_count: number;
    permissions_count: number;
    permissions: string[];
    protected: boolean;
    permissions_locked: boolean;
};

type PermissionGroup = {
    key: string;
    label: string;
    permissions: Array<{ name: string; label: string }>;
};

type Capabilities = {
    create: boolean;
    update: boolean;
    delete: boolean;
    assignPermissions: boolean;
    assignCriticalPermissions: boolean;
};

function CreateRoleDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Create role
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create role</DialogTitle>
                    <DialogDescription>
                        Add a role, then configure its permissions.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...store.form()}
                    className="grid gap-4"
                    onSuccess={() => setOpen(false)}
                    resetOnSuccess
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="role-name">Role name</Label>
                                <Input id="role-name" name="name" required />
                                <InputError message={errors.name} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Creating…' : 'Create role'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function RoleEditor({
    role,
    permissionGroups,
    criticalPermissions,
    capabilities,
}: {
    role: Role;
    permissionGroups: PermissionGroup[];
    criticalPermissions: string[];
    capabilities: Capabilities;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Pencil />
                    Configure
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{role.name}</DialogTitle>
                    <DialogDescription>
                        Page access and actions are enforced by Laravel on the
                        next request.
                    </DialogDescription>
                </DialogHeader>

                {capabilities.update && !role.protected && (
                    <Form
                        {...update.form(role.id)}
                        className="grid gap-3 rounded-lg border p-4"
                    >
                        {({ errors, processing }) => (
                            <>
                                <Label htmlFor={`role-name-${role.id}`}>
                                    Role name
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id={`role-name-${role.id}`}
                                        name="name"
                                        defaultValue={role.name}
                                        required
                                    />
                                    <Button type="submit" disabled={processing}>
                                        Rename
                                    </Button>
                                </div>
                                <InputError
                                    message={errors.name ?? errors.role}
                                />
                            </>
                        )}
                    </Form>
                )}

                {role.permissions_locked ? (
                    <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                        The Administrator role is protected and automatically
                        receives every registered permission.
                    </div>
                ) : capabilities.assignPermissions ? (
                    <Form
                        {...updatePermissions.form(role.id)}
                        className="grid gap-5"
                        transform={(data) => ({
                            ...data,
                            permissions: data.permissions ?? [],
                        })}
                    >
                        {({ errors, processing }) => (
                            <>
                                {permissionGroups.map((group) => (
                                    <fieldset
                                        key={group.key}
                                        className="grid gap-3 rounded-lg border p-4"
                                    >
                                        <legend className="px-1 font-medium">
                                            {group.label}
                                        </legend>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {group.permissions.map(
                                                (permission) => {
                                                    const checked =
                                                        role.permissions.includes(
                                                            permission.name,
                                                        );
                                                    const critical =
                                                        criticalPermissions.includes(
                                                            permission.name,
                                                        );
                                                    const locked =
                                                        critical &&
                                                        !capabilities.assignCriticalPermissions;

                                                    return (
                                                        <label
                                                            key={
                                                                permission.name
                                                            }
                                                            className="flex items-start gap-2 text-sm"
                                                        >
                                                            {locked &&
                                                                checked && (
                                                                    <input
                                                                        type="hidden"
                                                                        name="permissions[]"
                                                                        value={
                                                                            permission.name
                                                                        }
                                                                    />
                                                                )}
                                                            <input
                                                                type="checkbox"
                                                                name="permissions[]"
                                                                value={
                                                                    permission.name
                                                                }
                                                                defaultChecked={
                                                                    checked
                                                                }
                                                                disabled={
                                                                    locked
                                                                }
                                                                className="mt-0.5 size-4 rounded border-input"
                                                            />
                                                            <span>
                                                                {
                                                                    permission.label
                                                                }
                                                                <span className="block text-xs text-muted-foreground">
                                                                    {
                                                                        permission.name
                                                                    }
                                                                    {critical
                                                                        ? ' · critical'
                                                                        : ''}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </fieldset>
                                ))}
                                <InputError message={errors.permissions} />
                                <DialogFooter>
                                    <Button type="submit" disabled={processing}>
                                        {processing
                                            ? 'Saving…'
                                            : 'Save permissions'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                ) : (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        You can view this role but cannot change its
                        permissions.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function RolesIndex({
    roles,
    permissionGroups,
    criticalPermissions,
    capabilities,
}: {
    roles: Role[];
    permissionGroups: PermissionGroup[];
    criticalPermissions: string[];
    capabilities: Capabilities;
}) {
    return (
        <>
            <Head title="Role management" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Roles and permissions"
                    description="Configure page access and actions without changing application code."
                />

                <AdminOnlineBoundary>
                    {capabilities.create && (
                        <div className="flex justify-end">
                            <CreateRoleDialog />
                        </div>
                    )}
                    <div className="grid gap-4 lg:grid-cols-2">
                        {roles.map((role) => (
                            <Card key={role.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck />
                                        {role.name}
                                        {role.protected && (
                                            <Badge variant="secondary">
                                                System
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {role.users_count} user
                                        {role.users_count === 1
                                            ? ''
                                            : 's'} · {role.permissions_count}{' '}
                                        permission
                                        {role.permissions_count === 1
                                            ? ''
                                            : 's'}
                                    </CardDescription>
                                    <CardAction>
                                        <RoleEditor
                                            role={role}
                                            permissionGroups={permissionGroups}
                                            criticalPermissions={
                                                criticalPermissions
                                            }
                                            capabilities={capabilities}
                                        />
                                    </CardAction>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions
                                            .slice(0, 8)
                                            .map((permission) => (
                                                <Badge
                                                    key={permission}
                                                    variant="outline"
                                                >
                                                    {permission}
                                                </Badge>
                                            ))}
                                        {role.permissions.length > 8 && (
                                            <Badge variant="secondary">
                                                +{role.permissions.length - 8}{' '}
                                                more
                                            </Badge>
                                        )}
                                    </div>
                                    {capabilities.delete && !role.protected && (
                                        <Form
                                            {...destroy.form(role.id)}
                                            className="mt-4"
                                            onBefore={() =>
                                                window.confirm(
                                                    `Delete role ${role.name}?`,
                                                )
                                            }
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={
                                                        processing ||
                                                        role.users_count > 0
                                                    }
                                                >
                                                    <Trash2 />
                                                    Delete role
                                                </Button>
                                            )}
                                        </Form>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </AdminOnlineBoundary>
            </div>
        </>
    );
}

RolesIndex.layout = {
    breadcrumbs: [{ title: 'Roles', href: index() }],
};
