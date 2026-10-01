import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { BUSINESS_PATH, SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AvailabilityView } from './_components/AvailabilityView';

export const metadata = { title: 'Horas laborables' };

/** Abre en las Horas laborables del Dueño; `?empleado=<id>` elige a otro Empleado del Staff. */
export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ empleado?: string }> }) {
    const { empleado } = await searchParams;

    let staff;
    try {
        staff = await getInjection('IListStaffAvailabilitiesController')({
            employeeId: empleado && /^\d+$/.test(empleado) ? Number(empleado) : undefined,
        });
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    if (!staff) redirect(BUSINESS_PATH);

    return (
        <AvailabilityView
            key={staff.employeeId}
            employees={staff.employees}
            employeeId={staff.employeeId}
            availabilities={staff.availabilities}
            overrides={staff.overrides}
        />
    );
}
