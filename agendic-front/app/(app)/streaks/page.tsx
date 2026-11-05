import { redirect, unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { catalogServiceOptions, type RewardServiceOption } from './_components/streak-form';
import { StreakProgramForm } from './_components/StreakProgramForm';
import { StreakRewardsSection } from './_components/StreakRewardsSection';
import { StreaksScopeSelect } from './_components/StreaksScopeSelect';

export const metadata = { title: 'Rachas' };

const servicesOf = async (businessId: number | undefined): Promise<RewardServiceOption[]> =>
    businessId === undefined
        ? (await getInjection('IListMyPersonalServicesController')()).services
        : catalogServiceOptions(await getInjection('IListMyServicesController')(), businessId);

/**
 * Las Rachas de los Servicios personales del Usuario o, con `?businessId=` de su Negocio, las de ese Negocio. Solo su
 * Dueño lo ve: el `businessId` de otro Negocio cae en el alcance personal.
 */
export default async function StreaksPage({ searchParams }: { searchParams: Promise<{ businessId?: string }> }) {
    const { businessId: requested } = await searchParams;
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);
    let owned, businessId, program, services;
    try {
        owned = await getInjection('IGetMyBusinessController')();
        businessId = owned && requested === String(owned.id) ? owned.id : undefined;
        [program, services] = await Promise.all([
            getInjection('IGetStreakProgramController')(businessId === undefined ? {} : { businessId }),
            servicesOf(businessId),
        ]);
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <div className="mx-auto flex max-w-[800px] flex-col gap-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Rachas</h1>
                        <p className="m-0 text-sm text-muted-foreground">Premiá a los Clientes que vuelven seguido.</p>
                    </div>
                    {owned && (
                        <StreaksScopeSelect
                            user={{ name: user.name, imageUrl: user.imageUrl ?? null }}
                            business={{ id: owned.id, name: owned.name }}
                            selected={businessId}
                        />
                    )}
                </div>
                {/* `key`: each scope starts its form from its own saved values. */}
                <StreakProgramForm key={businessId ?? 'me'} businessId={businessId} active={program.active} burnAfterDays={program.burnAfterDays} />
                <StreakRewardsSection key={`rewards-${businessId ?? 'me'}`} businessId={businessId} rewards={program.rewards} services={services} />
            </div>
        </div>
    );
}
