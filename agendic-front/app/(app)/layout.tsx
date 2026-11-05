import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { SIGN_IN_PATH } from '@/app/routes';
import { AppToaster } from '@/app/_components/AppToaster';
import { SidebarInset, SidebarProvider } from '@/app/_components/ui/sidebar';
import { AppSidebar } from './_components/AppSidebar';
import { CalendarDisconnectedBanner } from './_components/CalendarDisconnectedBanner';
import { SiteHeader } from './_components/SiteHeader';
import { Suspense } from 'react';
import { UnseenBadgeCelebration } from './_components/UnseenBadgeCelebration';
import { SignOutOnDeactivated } from './_components/SignOutOnDeactivated';
import { getInjection } from '@/di/container';
import { isSessionExpired, isUserDeactivated } from '@/app/api-error';
import { loadMyBookings } from '@/app/(app)/bookings/load-my-bookings';
import { myPreferences } from './my-preferences';
import { isCalendarDisconnected, type CalendarProvider } from '@/src/entities/models/calendar-connection';
import type { NavItem } from './_components/types';

const navItems: NavItem[] = [
    { id: 'bookings', href: '/bookings', label: 'Turnos' },
    { id: 'availability', href: '/availability', label: 'Horas laborables' },
    { id: 'services', href: '/services', label: 'Servicios' },
    { id: 'business', href: '/business', label: 'Negocios' },
    { id: 'analytics', href: '/analytics', label: 'Analíticas' },
];

function initialsOf(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

/**
 * Cuántos Turnos esperan respuesta del Empleado; si la consulta falla, 0: el contador no vale un error de página.
 * Es la primera llamada con Sesión de cada carga del panel, así que `deactivated` avisa de un Usuario dado de baja
 * (ADR 0024) cuya Sesión quedó abierta en otro dispositivo.
 */
async function countPendingBookings() {
    try {
        const bookings = await loadMyBookings();
        return { count: bookings.filter((b) => b.status === 'PENDING').length, deactivated: false };
    } catch (error) {
        const deactivated = isUserDeactivated(error);
        if (!deactivated && !isSessionExpired(error)) getInjection('ICrashReporterService').report(error);
        return { count: 0, deactivated };
    }
}

/** El nombre del Negocio del Dueño, o null si no es Dueño o la consulta falla: no vale un error de página. */
async function ownedBusinessName() {
    try {
        return (await getInjection('IGetMyBusinessController')())?.name ?? null;
    } catch (error) {
        if (!isSessionExpired(error) && !isUserDeactivated(error)) getInjection('ICrashReporterService').report(error);
        return null;
    }
}

/** El proveedor del Calendario conectado del Usuario si dejó de dar acceso, o `null`; si la consulta falla, `null`: el aviso no vale un error de página. */
async function calendarDisconnected(): Promise<CalendarProvider | null> {
    try {
        const connection = await getInjection('IGetMyCalendarConnectionController')();
        return connection && isCalendarDisconnected(connection) ? connection.provider : null;
    } catch (error) {
        if (!isSessionExpired(error) && !isUserDeactivated(error)) getInjection('ICrashReporterService').report(error);
        return null;
    }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);
    const [{ count: pendingCount, deactivated }, businessName, preferences, disconnectedCalendar] = await Promise.all([
        countPendingBookings(),
        ownedBusinessName(),
        myPreferences(),
        calendarDisconnected(),
    ]);
    if (deactivated) return <SignOutOnDeactivated />;

    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': 'calc(var(--spacing) * 72)',
                    '--header-height': 'calc(var(--spacing) * 12)',
                } as React.CSSProperties
            }
        >
            <AppSidebar
                user={{ name: user.name, email: user.email, initials: initialsOf(user.name), imageUrl: user.imageUrl }}
                businessName={businessName}
                preferences={preferences}
                navItems={navItems.map((item) => (item.id === 'bookings' ? { ...item, count: pendingCount } : item))}
            />
            <SidebarInset className="min-w-0">
                <SiteHeader sections={navItems} />
                {disconnectedCalendar && <CalendarDisconnectedBanner provider={disconnectedCalendar} />}
                {/* The pages paint their own white background; rounding it keeps the inset's corners without clipping wide content. */}
                <div className="@container/main flex flex-1 flex-col md:*:rounded-b-xl">{children}</div>
            </SidebarInset>
            <AppToaster />
            <Suspense>
                <UnseenBadgeCelebration />
            </Suspense>
        </SidebarProvider>
    );
}
