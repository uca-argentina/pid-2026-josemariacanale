'use client';

import { useEffect, useState } from 'react';
import { AtSign, Fingerprint } from 'lucide-react';
import { PanelAvatar } from '@/app/(app)/_components/panel-ui';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/app/_components/ui/sheet';
import { addDays } from '@/app/_components/booking/format';
import { toIsoDay } from '@/app/_components/day-range';
import { RoleBadge } from '../../_components/business-ui';
import { loadEmployeeStatsAction, type EmployeeStatsData } from '../actions';
import type { EmployeeRow } from './EmployeesView';

/** Las tarjetas de estadísticas, en el orden en que se muestran. */
const STAT_CARDS = [
    { key: 'attended', label: 'Turnos atendidos' },
    { key: 'employeeNoShows', label: 'Ausencias del Anfitrión' },
    { key: 'rescheduled', label: 'Reagendados' },
    { key: 'cancelled', label: 'Cancelados' },
] as const satisfies readonly { key: keyof EmployeeStatsData; label: string }[];

/** El largo del período de las estadísticas en días: hoy y los anteriores. */
const STATS_DAYS = 30;

type StatsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: EmployeeStatsData };

function EmployeeStats({ businessId, employeeId }: { businessId: number; employeeId: number }) {
    const [state, setState] = useState<StatsState>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;
        // "Hoy" es el del browser: el servidor no sabe en qué zona está quien mira.
        const to = toIsoDay(new Date());
        void loadEmployeeStatsAction({ businessId, employeeId, from: addDays(to, -(STATS_DAYS - 1)), to }).then((result) => {
            if (!cancelled) setState(result.ok ? { status: 'ready', data: result.data } : { status: 'error' });
        });
        return () => {
            cancelled = true;
        };
    }, [businessId, employeeId]);

    if (state.status === 'error') {
        return (
            <p role="alert" className="m-0 rounded-md bg-[#f9fafb] px-4 py-3 text-[13px] font-medium text-[#6b7280]">
                No pudimos cargar las estadísticas. Probá de nuevo más tarde.
            </p>
        );
    }

    return (
        <section aria-label={`Estadísticas de los últimos ${STATS_DAYS} días`} className="flex flex-col gap-3">
            <h3 className="m-0 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">Últimos {STATS_DAYS} días</h3>
            <div className="grid grid-cols-2 gap-3">
                {STAT_CARDS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1 rounded-md border border-[#e5e7eb] p-4">
                        <span className="text-[12.5px] font-medium text-[#6b7280]">{label}</span>
                        <span className="text-[24px] font-bold tracking-[-0.02em]">{state.status === 'ready' ? state.data[key] : '—'}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

/**
 * Perfil de un Empleado en un panel lateral. Las estadísticas de los últimos 30 días van solo si `showStats`
 * (quien mira es el Dueño): sin eso ni se piden. Se monta al abrirse.
 */
export function EmployeeSheet({
    businessId,
    employee,
    showStats,
    onClose,
}: {
    businessId: number;
    employee: EmployeeRow;
    showStats: boolean;
    onClose: () => void;
}) {
    return (
        <Sheet open onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{employee.name}</SheetTitle>
                    <SheetDescription>{`Perfil de ${employee.name}`}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-4 pb-6">
                    <PanelAvatar name={employee.name} imageUrl={employee.imageUrl} className="size-18 text-[20px]" />
                    <dl className="m-0 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-y-4 text-[13.5px]">
                        <dt className="flex items-center gap-2 font-medium text-[#6b7280]">
                            <AtSign className="size-4" />
                            Email
                        </dt>
                        <dd className="m-0 font-semibold break-all">{employee.email}</dd>
                        <dt className="flex items-center gap-2 font-medium text-[#6b7280]">
                            <Fingerprint className="size-4" />
                            Rol
                        </dt>
                        <dd className="m-0">
                            <RoleBadge role={employee.role} />
                        </dd>
                    </dl>
                    {showStats && <EmployeeStats businessId={businessId} employeeId={employee.id} />}
                </div>
            </SheetContent>
        </Sheet>
    );
}
