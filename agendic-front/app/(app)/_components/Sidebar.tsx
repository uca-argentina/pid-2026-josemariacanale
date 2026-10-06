'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { Dialog } from 'radix-ui';
import {
    Calendar,
    Clock,
    LayoutGrid,
    Menu,
    Settings,
    Store,
    ExternalLink,
    Link as LinkIcon,
    LogOut,
    User,
    X,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from '@/app/_components/ui/avatar';
import { Badge } from '@/app/_components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/app/_components/ui/dropdown-menu';
import { Logo } from '@/app/_components/Logo';
import { cn } from '@/app/_components/utils';
import { SIGNED_IN_HOME_PATH } from '@/app/routes';
import type { CurrentBusinessUser, NavItem, SectionId } from './types';

const ICONS: Record<SectionId, React.ComponentType<{ className?: string }>> = {
    bookings: Calendar,
    availability: Clock,
    services: LayoutGrid,
    business: Store,
};

const ITEM = 'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left font-semibold transition-colors hover:bg-muted';

/** Logo, menú del Usuario, navegación y accesos al Enlace de reserva; `onNavigate` cierra el drawer de mobile antes de navegar o abrir el perfil. */
function SidebarContent({
    user,
    navItems,
    onNavigate,
    closeButton,
}: {
    user: CurrentBusinessUser;
    navItems: NavItem[];
    onNavigate?: () => void;
    closeButton?: React.ReactNode;
}) {
    const pathname = usePathname();
    const { openUserProfile, signOut } = useClerk();
    const isActive = (id: SectionId) => pathname.startsWith(`/${id}`);
    const tone = (id: SectionId) => (isActive(id) ? 'bg-secondary text-primary' : 'text-muted-foreground');

    return (
        <>
            <div className="flex items-center justify-between gap-2.5 px-1">
                <Link href={SIGNED_IN_HOME_PATH} onClick={onNavigate}>
                    <Logo />
                </Link>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-[10px] p-1 outline-none transition-colors hover:bg-muted focus-visible:bg-muted data-[state=open]:bg-muted">
                            <Avatar>
                                {user.imageUrl ? <AvatarImage src={user.imageUrl} alt={user.name} /> : null}
                                <AvatarFallback className="bg-secondary text-[12px] font-extrabold text-primary">
                                    {user.initials}
                                </AvatarFallback>
                                <AvatarBadge className="bg-[#16a34a] ring-white" aria-label="Conectado" />
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="end" className="min-w-[200px]">
                            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => {
                                    onNavigate?.();
                                    openUserProfile();
                                }}>
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
                    {closeButton}
                </div>
            </div>

            <nav className="flex flex-col gap-0.5">
                {navItems.map((item) => {
                    const Icon = ICONS[item.id];
                    return (
                        <Link
                            key={item.id}
                            href={`/${item.id}`}
                            onClick={onNavigate}
                            aria-current={isActive(item.id) ? 'page' : undefined}
                            className={cn(ITEM, 'text-[13.5px] tracking-[-0.01em]', tone(item.id))}
                        >
                            <Icon className="size-[18px]" />
                            {item.label}
                            {item.count ? (
                                <Badge className="ml-auto rounded-full border-transparent bg-secondary px-2 py-0.5 text-[11px] font-bold text-primary">
                                    {item.count}
                                </Badge>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto flex flex-col gap-0.5">
                <button type="button" className={cn(ITEM, 'text-[13px] text-muted-foreground hover:text-foreground')}>
                    <ExternalLink className="size-[17px]" />
                    Ver página pública
                </button>
                <button type="button" className={cn(ITEM, 'text-[13px] text-muted-foreground hover:text-foreground')}>
                    <LinkIcon className="size-[17px]" />
                    Copiar link para reservar
                </button>
            </div>
        </>
    );
}

/**
 * La navegación del panel. Desde lg es una columna fija a la izquierda; abajo de lg, una barra
 * superior con un botón que la abre como drawer, que se cierra al elegir una sección.
 */
export function Sidebar({ user, navItems }: { user: CurrentBusinessUser; navItems: NavItem[] }) {
    const [open, setOpen] = useState(false);
    const hasPending = navItems.some((item) => item.count);

    return (
        <>
            <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
                <Link href={SIGNED_IN_HOME_PATH}>
                    <Logo />
                </Link>
                <Dialog.Root open={open} onOpenChange={setOpen}>
                    <Dialog.Trigger
                        aria-label="Abrir menú"
                        className="relative rounded-[10px] p-2 text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                    >
                        <Menu className="size-5" />
                        {hasPending && (
                            <span aria-hidden className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-white" />
                        )}
                    </Dialog.Trigger>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#0f1b2d]/50 lg:hidden" />
                        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col gap-5 overflow-y-auto bg-white p-3.5 pt-4.5 shadow-[0_24px_60px_rgba(15,27,45,0.25)] outline-none lg:hidden">
                            <Dialog.Title className="sr-only">Menú</Dialog.Title>
                            <Dialog.Description className="sr-only">Secciones del panel</Dialog.Description>
                            <SidebarContent
                                user={user}
                                navItems={navItems}
                                onNavigate={() => setOpen(false)}
                                closeButton={
                                    <Dialog.Close
                                        aria-label="Cerrar menú"
                                        className="rounded-[10px] p-2 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted"
                                    >
                                        <X className="size-5" />
                                    </Dialog.Close>
                                }
                            />
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>

            <aside className="hidden w-[248px] shrink-0 flex-col gap-5 border-r border-border bg-white p-3.5 pt-4.5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
                <SidebarContent user={user} navItems={navItems} />
            </aside>
        </>
    );
}
