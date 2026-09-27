import { redirect } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { SIGN_IN_PATH } from '@/app/routes';
import { Sidebar } from './_components/Sidebar';
import { loadPendingCount } from './_components/mock-bookings';
import type { NavItem } from './_components/types';

const navItems: NavItem[] = [
    { id: 'bookings', label: 'Turnos' },
    { id: 'availability', label: 'Disponibilidad' },
    { id: 'services', label: 'Servicios' },
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
                // ponytail: cuenta los pendientes del mock; no sigue los Aceptar/Rechazar de la lista hasta que persistan.
                navItems={navItems.map((item) => (item.id === 'bookings' ? { ...item, count: loadPendingCount() } : item))}
            />
            <main className="flex min-w-0 flex-1 flex-col">{children}</main>
            <Toaster
                position="bottom-center"
                closeButton
                icons={{ success: <Check className="size-4" />, error: <X className="size-4 text-[#b91c1c]" /> }}
                toastOptions={{
                    unstyled: true,
                    classNames: {
                        toast: 'flex w-[360px] items-center gap-3 rounded-md border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] font-semibold text-[#0f1b2d] shadow-[0_10px_30px_rgba(15,27,45,0.12)]',
                        closeButton: 'order-last ml-auto shrink-0 text-[#6b7280] hover:text-[#0f1b2d] [&_svg]:size-4',
                    },
                }}
            />
        </div>
    );
}
