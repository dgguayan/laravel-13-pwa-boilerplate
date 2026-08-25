import { usePage } from '@inertiajs/react';
import {
    BookOpen,
    CheckSquare2,
    FolderGit2,
    LayoutGrid,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { OfflineLink } from '@/components/offline-link';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { edit as editProfile } from '@/routes/profile';
import type { NavItem } from '@/types';

const navigationIcons = {
    dashboard: LayoutGrid,
    roles: ShieldCheck,
    settings: Settings,
    tasks: CheckSquare2,
    users: Users,
};

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { navigation } = usePage().props;
    const mainNavItems: NavItem[] = navigation.map((item) => ({
        ...item,
        icon: navigationIcons[item.key as keyof typeof navigationIcons],
    }));
    const homeHref = mainNavItems[0]?.href ?? editProfile();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <OfflineLink href={homeHref} prefetch>
                                <AppLogo />
                            </OfflineLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
