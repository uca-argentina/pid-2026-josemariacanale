'use client';

import { useEffect, useState } from 'react';
import { CalendarX2, Loader2, UserRoundCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/app/_components/ui/avatar';
import { Button } from '@/app/_components/ui/button';
import { cn } from '@/app/_components/utils';
import { listSlotsAction } from '../actions';
import { addDays, endTime, formatDate, initials, shortWeekday, todayIn } from './format';
import type { Branch, Employee, Service, Slot, SlotDay } from './types';

/** Dos semanas desde hoy: entra en el máximo de 31 días que acepta el back. */
const DAYS_SHOWN = 14;

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; days: SlotDay[] };

const pillButton = 'h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold';

/**
 * El paso Horario. Pide los Horarios reservables al montarse, así que BookingFlow lo monta con
 * `key` por Servicio y Empleado: cambiar cualquiera de los dos, o volver a este paso, los pide de nuevo.
 */
export function TimeStep({
    service,
    employee,
    branch,
    date,
    slot,
    notice,
    onSelect,
    onChooseEmployee,
    onSeeEmployees,
}: {
    service: Service;
    employee: Employee;
    branch: Branch;
    date: string | null;
    slot: Slot | null;
    /** Un aviso que el paso muestra arriba, por ejemplo que el horario elegido se ocupó. */
    notice: string | null;
    onSelect: (date: string, slot: Slot | null) => void;
    onChooseEmployee: (employee: Employee) => void;
    onSeeEmployees: () => void;
}) {
    const [load, setLoad] = useState<Load>({ status: 'loading' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let current = true;
        // Hoy en la Sucursal, no en el reloj del Cliente: el back cuenta las fechas en su zona horaria.
        const from = todayIn(branch.timeZone);
        listSlotsAction({
            serviceId: service.id,
            employeeId: employee.id,
            from,
            to: addDays(from, DAYS_SHOWN - 1),
        }).then(
            (result) => {
                if (!current) return;
                if (!result.ok) return setLoad({ status: 'error', message: result.message });
                setLoad({ status: 'ready', days: result.days });
                // Se abre el primer día con lugar, así se ve de entrada si el profesional tiene horarios.
                if (!date) {
                    const first = result.days.find((d) => d.slots.length > 0) ?? result.days[0];
                    if (first) onSelect(first.date, null);
                }
            },
            () => current && setLoad({ status: 'error', message: 'No pudimos cargar los horarios. Intentá de nuevo.' }),
        );
        return () => {
            current = false;
        };
        // Solo al montarse y al reintentar: `date` y `onSelect` cambian con cada elección del Cliente.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]);

    const retry = () => {
        setLoad({ status: 'loading' });
        setAttempt((a) => a + 1);
    };

    const days = load.status === 'ready' ? load.days : [];
    const chosenDay = days.find((d) => d.date === date) ?? null;
    // El próximo después del elegido; si no hay, el primero de la tira.
    const withSlots = days.filter((d) => d.slots.length > 0 && d.date !== date);
    const nextWithSlots = withSlots.find((d) => !date || d.date > date) ?? withSlots[0];
    const covering =
        chosenDay?.reason === 'COVERED'
            ? service.employees.find((e) => e.id === chosenDay.coveredByEmployeeId)
            : undefined;

    const goToNext = nextWithSlots && (
        <Button variant="outline" onClick={() => onSelect(nextWithSlots.date, null)} className={pillButton}>
            Ir al próximo día con lugar
        </Button>
    );
    const seeEmployees = (
        <Button variant="outline" onClick={onSeeEmployees} className={pillButton}>
            Ver todos los profesionales
        </Button>
    );

    return (
        <>
            <div className="flex items-center gap-2.5 rounded-full border border-border py-1.5 pr-4 pl-1.5">
                <Avatar>
                    <AvatarFallback className="bg-muted text-[10px] font-extrabold text-foreground">
                        {initials(employee.name)}
                    </AvatarFallback>
                </Avatar>
                <span className="text-[14px] font-bold tracking-[-0.02em]">{employee.name}</span>
            </div>

            {notice && (
                <p role="alert" className="mt-5 rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                    {notice}
                </p>
            )}

            {load.status === 'loading' && (
                <p className="mt-7 flex items-center gap-2 text-[14px] text-muted-foreground" role="status">
                    <Loader2 className="size-4 animate-spin" />
                    Buscando horarios…
                </p>
            )}

            {load.status === 'error' && (
                <div className="mt-7 flex flex-col items-start gap-3" role="alert">
                    <p className="text-[14px] text-muted-foreground">{load.message}</p>
                    <Button variant="outline" onClick={retry} className={pillButton}>
                        Reintentar
                    </Button>
                </div>
            )}

            {load.status === 'ready' && days.length === 0 && (
                <p className="mt-7 text-[14px] text-muted-foreground">
                    {employee.name} no tiene horarios en las próximas dos semanas.
                </p>
            )}

            {days.length > 0 && (
                <ol className="mt-6 flex flex-wrap gap-3" aria-label="Días disponibles">
                    {days.map((day) => {
                        const noSlots = day.slots.length === 0;
                        const active = day.date === date;
                        return (
                            <li key={day.date} className="flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onSelect(day.date, null)}
                                    aria-pressed={active}
                                    aria-label={`${formatDate(day.date)}${noSlots ? ', sin horarios' : ''}`}
                                    className={cn(
                                        'flex size-[58px] items-center justify-center rounded-full border text-[18px] font-extrabold tracking-[-0.03em] transition-colors',
                                        active
                                            ? 'border-foreground bg-foreground text-white'
                                            : 'border-border hover:border-foreground/40',
                                        // Sin `/50`: es un botón clickeable, tiene que pasar contraste AA.
                                        noSlots && !active && 'text-muted-foreground line-through',
                                    )}
                                >
                                    {Number(day.date.slice(8))}
                                </button>
                                <span className="text-[12.5px] font-semibold text-muted-foreground">
                                    {shortWeekday(day.date)}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {days.length > 0 && !chosenDay && (
                <p className="mt-7 text-[14px] text-muted-foreground">
                    Elegí un día para ver los horarios libres.
                </p>
            )}

            {chosenDay && chosenDay.slots.length > 0 && (
                <>
                    <h3 className="mt-8 mb-3 text-[13px] font-extrabold tracking-[0.02em] text-muted-foreground uppercase">
                        Horarios del {formatDate(chosenDay.date)}
                    </h3>
                    <ol className="flex flex-col gap-2.5">
                        {chosenDay.slots.map((s) => {
                            const active = s.startsAt === slot?.startsAt;
                            return (
                                <li key={s.startsAt}>
                                    <button
                                        type="button"
                                        onClick={() => onSelect(chosenDay.date, s)}
                                        aria-pressed={active}
                                        className={cn(
                                            'flex w-full items-center justify-between rounded-xl border px-4.5 py-3.5 text-left transition-colors',
                                            active
                                                ? 'border-foreground ring-1 ring-foreground'
                                                : 'border-border hover:border-foreground/40',
                                        )}
                                    >
                                        <span className="text-[15px] font-bold tracking-[-0.02em]">
                                            {s.time}
                                        </span>
                                        <span className="text-[13px] font-medium text-muted-foreground">
                                            termina {endTime(s.time, service.durationMinutes)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </>
            )}

            {chosenDay?.reason === 'FULLY_BOOKED' && (
                <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-border px-5 py-14 text-center">
                    <Avatar className="size-12">
                        <AvatarFallback className="bg-muted text-[14px] font-extrabold text-foreground">
                            {initials(employee.name)}
                        </AvatarFallback>
                    </Avatar>
                    <p className="mt-1 text-[17px] font-extrabold tracking-[-0.02em]">
                        {employee.name} tiene la agenda completa ese día
                    </p>
                    {nextWithSlots && (
                        <p className="text-[13.5px] text-muted-foreground first-letter:uppercase">
                            Tiene lugar el {formatDate(nextWithSlots.date)}
                        </p>
                    )}
                    <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                        {goToNext}
                        {seeEmployees}
                    </div>
                </div>
            )}

            {chosenDay?.reason === 'NOT_WORKING' && (
                <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input px-5 py-14 text-center">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                        <CalendarX2 className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold tracking-[-0.02em]">
                        {employee.name} no atiende ese día
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                        {goToNext}
                        {seeEmployees}
                    </div>
                </div>
            )}

            {chosenDay?.reason === 'COVERED' && (
                <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input px-5 py-14 text-center">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                        <UserRoundCheck className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold tracking-[-0.02em]">
                        {employee.name} no atiende ese día
                    </p>
                    {covering && (
                        <p className="text-[13.5px] text-muted-foreground">
                            Ese día atiende {covering.name} en su lugar.
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                        {covering ? (
                            <Button variant="outline" onClick={() => onChooseEmployee(covering)} className={pillButton}>
                                Reservar con {covering.name}
                            </Button>
                        ) : (
                            seeEmployees
                        )}
                        {goToNext}
                    </div>
                </div>
            )}
        </>
    );
}
