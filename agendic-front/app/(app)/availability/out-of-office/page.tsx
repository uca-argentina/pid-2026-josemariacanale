import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { myPreferences } from '../../my-preferences';
import { OutOfOfficeView } from './_components/OutOfOfficeView';

export const metadata = { title: 'Fuera de la oficina' };

/** Los períodos Fuera de la oficina del Usuario con Sesión; `?nuevo` abre el modal de período nuevo. */
export default async function OutOfOfficePage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
    const { nuevo } = await searchParams;
    let periods;
    try {
        periods = await getInjection('IListMyOutOfOfficeController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return <OutOfOfficeView periods={periods} openNew={nuevo !== undefined} weekStart={(await myPreferences()).weekStart} />;
}
