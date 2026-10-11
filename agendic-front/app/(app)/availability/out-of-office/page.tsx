import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { OutOfOfficeView } from './_components/OutOfOfficeView';

export const metadata = { title: 'Fuera de la oficina' };

/** Los períodos Fuera de la oficina del Usuario con Sesión. */
export default async function OutOfOfficePage() {
    let periods;
    try {
        periods = await getInjection('IListMyOutOfOfficeController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return <OutOfOfficeView periods={periods} />;
}
