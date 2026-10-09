'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import {
    Calendar,
    ChartColumn,
    Clock,
    EllipsisVertical,
    ExternalLink,
    LayoutGrid,
    Link as LinkIcon,
    LogOut,
    Settings,
    Store,
    User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/_components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/app/_components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/app/_components/ui/sidebar';
import { Logo } from '@/app/_components/Logo';
import { cn } from '@/app/_components/utils';
import { SIGNED_IN_HOME_PATH, sectionOf } from '@/app/routes';
import type { CurrentBusinessUser, NavItem, SectionId } from './types';

const ICONS: Record<SectionId, React.ComponentType> = {
    bookings: Calendar,
    availability: Clock,
    services: LayoutGrid,
    business: Store,
    analytics: ChartColumn,
};

// The primitive hovers with the active item's token; Calendly hovers a lighter celeste. Only on inactive items:
// the primitive's data-active styles sit inside :where(), so this hover would beat them on the active one.
const HOVER = 'hover:bg-[#f2f7ff] hover:text-sidebar-foreground';

/**
 * El sidebar del panel: las secciones, con el contador de Turnos pendientes en Turnos, y el Usuario al pie. En el
 * celular es una hoja lateral que se cierra al elegir una sección.
 */
export function AppSidebar({ user, navItems }: { user: CurrentBusinessUser; navItems: NavItem[] }) {
    return (
        <Sidebar variant="inset" collapsible="offcanvas">
            <SidebarHeader>
                <Link
                    href={SIGNED_IN_HOME_PATH}
                    className="w-fit rounded-md p-1.5 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                    <Logo />
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
                <NavSecondary />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
        </Sidebar>
    );
}

function NavMain({ items }: { items: NavItem[] }) {
    const active = sectionOf(usePathname(), items);
    const { setOpenMobile } = useSidebar();

    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const Icon = ICONS[item.id];
                        const isActive = item === active;
                        return (
                            <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton asChild isActive={isActive} className={cn('font-semibold', !isActive && HOVER)}>
                                    <Link
                                        href={item.href}
                                        aria-current={isActive ? 'page' : undefined}
                                        onClick={() => setOpenMobile(false)}
                                    >
                                        <Icon />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                                {item.count ? (
                                    <SidebarMenuBadge>
                                        {item.count}
                                        <span className="sr-only"> pendientes</span>
                                    </SidebarMenuBadge>
                                ) : null}
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

function NavSecondary() {
    return (
        <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton className={cn('font-semibold', HOVER)}>
                            <ExternalLink />
                            <span>Ver página pública</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton className={cn('font-semibold', HOVER)}>
                            <LinkIcon />
                            <span>Copiar link para reservar</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

function NavUser({ user }: { user: CurrentBusinessUser }) {
    const { isMobile } = useSidebar();
    const { openUserProfile, signOut } = useClerk();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className={cn(HOVER, 'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground')}
                        >
                            <Avatar>
                                {user.imageUrl ? <AvatarImage src={user.imageUrl} alt={user.name} /> : null}
                                <AvatarFallback className="bg-secondary text-[12px] font-extrabold text-primary">
                                    {user.initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                            </div>
                            <EllipsisVertical className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-[200px]"
                    >
                        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openUserProfile()}>
                            <User className="size-[15px]" />
                            Mi perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled className="opacity-50">
                            <Settings className="size-[15px]" />
                            Mi configuración
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() => signOut({ redirectUrl: '/' })}
                            className="text-destructive hover:text-destructive focus:text-destructive"
                        >
                            <LogOut className="size-[15px]" />
                            Cerrar sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
