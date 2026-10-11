'use client';

import { useState } from 'react';
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
    SlidersHorizontal,
    Store,
    User,
    UserX,
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
import type { Preferences } from '@/src/entities/models/user';
import { PreferencesDialog } from './PreferencesDialog';
import { RetireAccountDialog } from './RetireAccountDialog';
import type { CurrentBusinessUser, NavItem, SectionId } from './types';

const ICONS: Record<SectionId, React.ComponentType> = {
    bookings: Calendar,
    availability: Clock,
    services: LayoutGrid,
    business: Store,
    analytics: ChartColumn,
};

// The primitive hovers with the active item's token; the panel hovers a lighter celeste. Only on inactive items:
// the primitive's data-active styles sit inside :where(), so this hover would beat them on the active one.
const HOVER = 'hover:bg-[#f2f7ff] hover:text-sidebar-foreground';

/**
 * El sidebar del panel: las secciones, con el contador de Turnos pendientes en Turnos, y el Usuario al pie. En el
 * celular es una hoja lateral que se cierra al elegir una sección. `businessName` es el Negocio del Dueño, que el
 * diálogo de darse de baja nombra; null si no es Dueño. `preferences` son las del Usuario, que el diálogo de Preferencias edita.
 */
export function AppSidebar({
    user,
    navItems,
    businessName,
    preferences,
}: {
    user: CurrentBusinessUser;
    navItems: NavItem[];
    businessName: string | null;
    preferences: Preferences;
}) {
    const { setOpenMobile } = useSidebar();

    return (
        <Sidebar variant="inset" collapsible="offcanvas">
            <SidebarHeader>
                <Link
                    href={SIGNED_IN_HOME_PATH}
                    onClick={() => setOpenMobile(false)}
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
                <NavUser user={user} businessName={businessName} preferences={preferences} />
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
                                <SidebarMenuButton
                                    isActive={isActive}
                                    className={cn('font-semibold', !isActive && HOVER)}
                                    render={
                                        <Link
                                            href={item.href}
                                            aria-current={isActive ? 'page' : undefined}
                                            onClick={() => setOpenMobile(false)}
                                        />
                                    }
                                >
                                    <Icon />
                                    <span>{item.label}</span>
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

function NavUser({
    user,
    businessName,
    preferences: initialPreferences,
}: {
    user: CurrentBusinessUser;
    businessName: string | null;
    preferences: Preferences;
}) {
    const [retiring, setRetiring] = useState(false);
    const [editingPreferences, setEditingPreferences] = useState(false);
    const [preferences, setPreferences] = useState(initialPreferences);
    const { isMobile, setOpenMobile } = useSidebar();
    const { openUserProfile, signOut } = useClerk();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                size="lg"
                                className={cn(HOVER, 'data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground')}
                            />
                        }
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
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        className="w-(--anchor-width) min-w-[200px]"
                        // Al cerrarse, el menú devuelve el foco al botón y el diálogo recién abierto lo toma por un clic afuera y se cierra.
                        finalFocus={() => !retiring && !editingPreferences}
                    >
                        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                        <DropdownMenuItem
                            // Close the sheet first: its focus trap would hold focus away from Clerk's modal.
                            onClick={() => {
                                setOpenMobile(false);
                                openUserProfile();
                            }}
                        >
                            <User className="size-[15px]" />
                            Mi perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled className="opacity-50">
                            <Settings className="size-[15px]" />
                            Mi configuración
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => signOut({ redirectUrl: '/' })}
                            className="text-destructive hover:text-destructive focus:text-destructive"
                        >
                            <LogOut className="size-[15px]" />
                            Cerrar sesión
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingPreferences(true)}>
                            <SlidersHorizontal className="size-[15px]" />
                            Preferencias
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setRetiring(true)}
                            className="text-destructive hover:text-destructive focus:text-destructive"
                        >
                            <UserX className="size-[15px]" />
                            Darme de baja
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
            {editingPreferences && (
                <PreferencesDialog
                    preferences={preferences}
                    onSaved={setPreferences}
                    onClose={() => setEditingPreferences(false)}
                />
            )}
            {retiring && <RetireAccountDialog businessName={businessName} onClose={() => setRetiring(false)} />}
        </SidebarMenu>
    );
}
