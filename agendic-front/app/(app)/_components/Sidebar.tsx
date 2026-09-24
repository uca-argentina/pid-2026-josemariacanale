'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import {
    Calendar,
    Clock,
    LayoutGrid,
    Users,
    Building2,
    UserRound,
    BarChart3,
    Settings,
    Store,
    ExternalLink,
    Link as LinkIcon,
    LogOut,
    User,
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
    employees: Users,
    branches: Building2,
    clients: UserRound,
    metrics: BarChart3,
    business: Store,
};

const ITEM = 'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left font-semibold transition-colors hover:bg-muted';

export function Sidebar({ user, navItems }: { user: CurrentBusinessUser; navItems: NavItem[] }) {
    const pathname = usePathname();
    const { openUserProfile, signOut } = useClerk();
    const isActive = (id: SectionId) => pathname.startsWith(`/${id}`);
    const tone = (id: SectionId) => (isActive(id) ? 'bg-secondary text-primary' : 'text-muted-foreground');

    return (
        <aside className="flex w-[248px] shrink-0 flex-col gap-5 border-r border-border bg-white p-3.5 pt-4.5">
            <div className="flex items-center justify-between gap-2.5 px-1">
                <Link href={SIGNED_IN_HOME_PATH}>
                    <Logo />
                </Link>
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
            </div>

            <nav className="flex flex-col gap-0.5">
                {navItems.map((item) => {
                    const Icon = ICONS[item.id];
                    return (
                        <Link
                            key={item.id}
                            href={`/${item.id}`}
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
        </aside>
    );
}
