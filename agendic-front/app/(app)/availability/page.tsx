import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AvailabilityView } from './_components/AvailabilityView';

export const metadata = { title: 'Horas laborables' };

/** Las Horas laborables del Usuario con Sesión; `?id=<id>` abre una en su editor. */
export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const { id } = await searchParams;

    let view;
    try {
        view = await getInjection('IListMyAvailabilitiesController')({
            availabilityId: id && /^\d+$/.test(id) ? Number(id) : undefined,
        });
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return <AvailabilityView availabilities={view.availabilities} open={view.open} />;
}
