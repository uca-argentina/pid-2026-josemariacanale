import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { SIGN_IN_PATH } from '@/app/routes';
import { Sidebar } from './_components/Sidebar';
import { pendingCount } from './_components/mock-turnos';
import type { NavItem } from './_components/types';

const navItems: NavItem[] = [
    { id: 'bookings', label: 'Turnos', count: pendingCount },
    { id: 'availability', label: 'Disponibilidad' },
    { id: 'services', label: 'Servicios' },
    { id: 'employees', label: 'Profesionales' },
    { id: 'branches', label: 'Sucursales' },
    { id: 'clients', label: 'Clientes' },
    { id: 'metrics', label: 'Métricas' },
    { id: 'business', label: 'Mi Negocio' },
];

function initialsOf(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);

    return (
        <div className="flex min-h-screen w-full bg-muted">
            <Sidebar
                user={{ name: user.name, initials: initialsOf(user.name), imageUrl: user.imageUrl }}
                navItems={navItems}
            />
            <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
    );
}
