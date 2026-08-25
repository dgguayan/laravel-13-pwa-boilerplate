import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/Admin/UserController';
import { AdminOnlineBoundary } from '@/components/admin-online-boundary';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    is_active: boolean;
    roles: string[];
    created_at: string | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedUsers = {
    data: ManagedUser[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

type Capabilities = {
    create: boolean;
    update: boolean;
    delete: boolean;
    assignRoles: boolean;
};

function RoleFields({
    roles,
    selected,
}: {
    roles: string[];
    selected: string[];
}) {
    return (
        <div className="grid gap-2">
            <Label>Roles</Label>
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {roles.map((role) => (
                    <label
                        key={role}
                        className="flex items-center gap-2 text-sm"
                    >
                        <input
                            type="checkbox"
                            name="roles[]"
                            value={role}
                            defaultChecked={selected.includes(role)}
                            className="size-4 rounded border-input"
                        />
                        {role}
                    </label>
                ))}
            </div>
        </div>
    );
}

function CreateUserDialog({
    roles,
    capabilities,
}: {
    roles: string[];
    capabilities: Capabilities;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Create user
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create user</DialogTitle>
                    <DialogDescription>
                        Create an active, verified account and assign its
                        access.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...store.form()}
                    className="grid gap-4"
                    onSuccess={() => setOpen(false)}
                    resetOnSuccess
                    transform={(data) =>
                        capabilities.assignRoles
                            ? { ...data, roles: data.roles ?? [] }
                            : data
                    }
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-name">Name</Label>
                                    <Input
                                        id="create-name"
                                        name="name"
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-email">Email</Label>
                                    <Input
                                        id="create-email"
                                        name="email"
                                        type="email"
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-password">
                                        Password
                                    </Label>
                                    <Input
                                        id="create-password"
                                        name="password"
                                        type="password"
                                        required
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-password-confirmation">
                                        Confirm password
                                    </Label>
                                    <Input
                                        id="create-password-confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-status">Status</Label>
                                <select
                                    id="create-status"
                                    name="is_active"
                                    defaultValue="1"
                                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                                >
                                    <option value="1">Active</option>
                                    <option value="0">Disabled</option>
                                </select>
                            </div>
                            {capabilities.assignRoles && (
                                <RoleFields roles={roles} selected={[]} />
                            )}
                            <InputError message={errors.roles} />
                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Creating…' : 'Create user'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditUserDialog({
    user,
    roles,
    capabilities,
}: {
    user: ManagedUser;
    roles: string[];
    capabilities: Capabilities;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${user.name}`}
                >
                    <Pencil />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit {user.name}</DialogTitle>
                    <DialogDescription>
                        Update account details, status, password, or roles.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...update.form(user.id)}
                    className="grid gap-4"
                    onSuccess={() => setOpen(false)}
                    transform={(data) =>
                        capabilities.assignRoles
                            ? { ...data, roles: data.roles ?? [] }
                            : data
                    }
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor={`name-${user.id}`}>
                                        Name
                                    </Label>
                                    <Input
                                        id={`name-${user.id}`}
                                        name="name"
                                        defaultValue={user.name}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor={`email-${user.id}`}>
                                        Email
                                    </Label>
                                    <Input
                                        id={`email-${user.id}`}
                                        name="email"
                                        type="email"
                                        defaultValue={user.email}
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor={`password-${user.id}`}>
                                        New password
                                    </Label>
                                    <Input
                                        id={`password-${user.id}`}
                                        name="password"
                                        type="password"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor={`password-confirmation-${user.id}`}
                                    >
                                        Confirm new password
                                    </Label>
                                    <Input
                                        id={`password-confirmation-${user.id}`}
                                        name="password_confirmation"
                                        type="password"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`status-${user.id}`}>
                                    Status
                                </Label>
                                <select
                                    id={`status-${user.id}`}
                                    name="is_active"
                                    defaultValue={user.is_active ? '1' : '0'}
                                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                                >
                                    <option value="1">Active</option>
                                    <option value="0">Disabled</option>
                                </select>
                                <InputError message={errors.is_active} />
                            </div>
                            {capabilities.assignRoles && (
                                <RoleFields
                                    roles={roles}
                                    selected={user.roles}
                                />
                            )}
                            <InputError message={errors.roles} />
                            <InputError message={errors.user} />
                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Saving…' : 'Save changes'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function paginationLabel(label: string): string {
    return label.replace('&laquo;', '').replace('&raquo;', '').trim();
}

export default function UsersIndex({
    users,
    roles,
    filters,
    capabilities,
}: {
    users: PaginatedUsers;
    roles: string[];
    filters: { search: string };
    capabilities: Capabilities;
}) {
    return (
        <>
            <Head title="User management" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="User management"
                    description="Create accounts, control status, and assign roles."
                />

                <AdminOnlineBoundary>
                    {capabilities.create && (
                        <div className="flex justify-end">
                            <CreateUserDialog
                                roles={roles}
                                capabilities={capabilities}
                            />
                        </div>
                    )}
                    <Form {...index.form()} className="flex max-w-md gap-2">
                        <Input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Search name or email"
                        />
                        <Button type="submit" variant="outline">
                            <Search />
                            Search
                        </Button>
                    </Form>

                    <Card>
                        <CardContent className="overflow-x-auto px-0">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            User
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Roles
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Created
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.data.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">
                                                    {user.name}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {user.email}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.length > 0 ? (
                                                        user.roles.map(
                                                            (role) => (
                                                                <Badge
                                                                    key={role}
                                                                    variant="secondary"
                                                                >
                                                                    {role}
                                                                </Badge>
                                                            ),
                                                        )
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            No roles
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={
                                                        user.is_active
                                                            ? 'outline'
                                                            : 'destructive'
                                                    }
                                                >
                                                    {user.is_active
                                                        ? 'Active'
                                                        : 'Disabled'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {user.created_at
                                                    ? new Date(
                                                          user.created_at,
                                                      ).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {capabilities.update && (
                                                        <EditUserDialog
                                                            user={user}
                                                            roles={roles}
                                                            capabilities={
                                                                capabilities
                                                            }
                                                        />
                                                    )}
                                                    {capabilities.delete && (
                                                        <Form
                                                            {...destroy.form(
                                                                user.id,
                                                            )}
                                                            onBefore={() =>
                                                                window.confirm(
                                                                    `Delete ${user.name}? This cannot be undone.`,
                                                                )
                                                            }
                                                        >
                                                            {({
                                                                processing,
                                                            }) => (
                                                                <Button
                                                                    type="submit"
                                                                    size="icon-sm"
                                                                    variant="ghost"
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                    aria-label={`Delete ${user.name}`}
                                                                >
                                                                    <Trash2 />
                                                                </Button>
                                                            )}
                                                        </Form>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {users.data.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    No users matched your search.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Showing {users.from ?? 0}–{users.to ?? 0} of{' '}
                            {users.total}
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {users.links.map((link, position) =>
                                link.url ? (
                                    <Button
                                        key={`${link.label}-${position}`}
                                        asChild
                                        size="sm"
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                    >
                                        <Link href={link.url} preserveScroll>
                                            {paginationLabel(link.label)}
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        key={`${link.label}-${position}`}
                                        size="sm"
                                        variant="outline"
                                        disabled
                                    >
                                        {paginationLabel(link.label)}
                                    </Button>
                                ),
                            )}
                        </div>
                    </div>
                </AdminOnlineBoundary>
            </div>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'Users', href: index() }],
};
