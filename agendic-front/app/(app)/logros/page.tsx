import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AchievementsView } from './_components/AchievementsView';

export const metadata = { title: 'Logros' };

/** Las Insignias del Usuario con Sesión. Si la consulta falla se avisa: una lista vacía parecería que no ganó nada. */
export default async function AchievementsPage() {
    let badges;
    try {
        badges = await getInjection('IListMyBadgesController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return <AchievementsView badges={badges} />;
}
