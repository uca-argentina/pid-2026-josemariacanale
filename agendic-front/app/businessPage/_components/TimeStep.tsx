'use client';

import { useEffect, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/app/_components/ui/avatar';
import { Button } from '@/app/_components/ui/button';
import { cn } from '@/app/_components/utils';
import { endTime, formatDate, initials } from './mock-business';
import type { AvailableDay, Branch, Employee, Service } from './types';
import { getSlotsAction } from '../actions';
import { getDateRangeForSlots, mapBackendDaysToAvailableDays } from './slots-utils';

export function TimeStep({
    service,
    employee,
    branch,
    date,
    time,
    onSelect,
    onSeeEmployees,
}: {
    service: Service;
    employee: Employee;
    branch: Branch;
    date: string | null;
    time: string | null;
    onSelect: (date: string, time: string | null) => void;
    onSeeEmployees: () => void;
}) {
    const currentKey = `${service.id}-${employee.id}-${branch.timeZone ?? ''}`;
    const [state, setState] = useState<{
        key: string;
        days: AvailableDay[];
        isLoading: boolean;
        error: string | null;
    }>({
        key: '',
        days: [],
        isLoading: true,
        error: null,
    });

    const isLoading = state.key !== currentKey || state.isLoading;
    const days = state.key === currentKey ? state.days : [];
    const errorMessage = state.key === currentKey ? state.error : null;

    useEffect(() => {
        let active = true;
        const { from, to } = getDateRangeForSlots(undefined, 14);

        getSlotsAction({
            serviceId: service.id,
            employeeId: employee.id,
            from,
            to,
        })
            .then((res) => {
                if (!active) return;
                if (res.error) {
                    setState({
                        key: currentKey,
                        days: [],
                        isLoading: false,
                        error: res.error,
                    });
                    return;
                }
                if (res.days && res.timeZone) {
                    const availableDaysList = mapBackendDaysToAvailableDays(res.days, res.timeZone);
                    setState({
                        key: currentKey,
                        days: availableDaysList,
                        isLoading: false,
                        error: null,
                    });
                    if (!date && availableDaysList.length > 0) {
                        onSelect(availableDaysList[0].date, null);
                    }
                }
            })
            .catch((err) => {
                if (!active) return;
                setState({
                    key: currentKey,
                    days: [],
                    isLoading: false,
                    error: err?.message || 'Error al cargar los horarios',
                });
            });

        return () => {
            active = false;
        };
    }, [service.id, employee.id, branch.timeZone, currentKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const chosenDay = days.find((d) => d.date === date) ?? null;
    const nextWithSlots = days.find((d) => d.slots.length > 0);

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

            {isLoading && (
                <div className="mt-8 flex justify-center py-12">
                    <p className="text-[14px] text-muted-foreground animate-pulse">
                        Cargando horarios disponibles...
                    </p>
                </div>
            )}

            {errorMessage && !isLoading && (
                <div
                    className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center"
                    role="alert"
                >
                    <p className="text-[15px] font-bold text-destructive">{errorMessage}</p>
                    <Button
                        variant="outline"
                        onClick={onSeeEmployees}
                        className="mt-2 h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold"
                    >
                        Ver todos los profesionales
                    </Button>
                </div>
            )}

            {!isLoading && !errorMessage && (
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
                                        noSlots && !active && 'text-muted-foreground line-through',
                                    )}
                                >
                                    {day.dayOfMonth}
                                </button>
                                <span className="text-[12.5px] font-semibold text-muted-foreground">
                                    {day.weekday}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {!isLoading && !errorMessage && !chosenDay && (
                <p className="mt-7 text-[14px] text-muted-foreground">
                    Elegí un día para ver los horarios libres.
                </p>
            )}

            {!isLoading && !errorMessage && chosenDay && chosenDay.slots.length > 0 && (
                <>
                    <h3 className="mt-8 mb-3 text-[13px] font-extrabold tracking-[0.02em] text-muted-foreground uppercase">
                        Horarios del {formatDate(chosenDay.date)}
                    </h3>
                    <ol className="flex flex-col gap-2.5">
                        {chosenDay.slots.map((slot) => {
                            const active = slot === time;
                            return (
                                <li key={slot}>
                                    <button
                                        type="button"
                                        onClick={() => onSelect(chosenDay.date, slot)}
                                        aria-pressed={active}
                                        className={cn(
                                            'flex w-full items-center justify-between rounded-xl border px-4.5 py-3.5 text-left transition-colors',
                                            active
                                                ? 'border-foreground ring-1 ring-foreground'
                                                : 'border-border hover:border-foreground/40',
                                        )}
                                    >
                                        <span className="text-[15px] font-bold tracking-[-0.02em]">
                                            {slot}
                                        </span>
                                        <span className="text-[13px] font-medium text-muted-foreground">
                                            termina {endTime(slot, service.durationMinutes)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </>
            )}

            {!isLoading && !errorMessage && chosenDay && chosenDay.slots.length === 0 && chosenDay.reason === 'FULLY_BOOKED' && (
                <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-border px-5 py-14 text-center">
                    <Avatar className="size-12">
                        <AvatarFallback className="bg-muted text-[14px] font-extrabold text-foreground">
                            {initials(employee.name)}
                        </AvatarFallback>
                    </Avatar>
                    <p className="mt-1 text-[17px] font-extrabold tracking-[-0.02em]">
                        No quedan horarios
                    </p>
                    {nextWithSlots && (
                        <p className="text-[13.5px] text-muted-foreground first-letter:uppercase">
                            Tiene lugar el {formatDate(nextWithSlots.date)}
                        </p>
                    )}
                    <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                        {nextWithSlots && (
                            <Button
                                variant="outline"
                                onClick={() => onSelect(nextWithSlots.date, null)}
                                className="h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold"
                            >
                                Ir al próximo día con lugar
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={onSeeEmployees}
                            className="h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold"
                        >
                            Ver todos los profesionales
                        </Button>
                    </div>
                </div>
            )}

            {!isLoading && !errorMessage && chosenDay && chosenDay.slots.length === 0 && (chosenDay.reason === 'NOT_WORKING' || chosenDay.reason === 'COVERED' || !chosenDay.reason) && (
                <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input px-5 py-14 text-center">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                        <CalendarX2 className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold tracking-[-0.02em]">
                        El Empleado no trabaja o está anulado
                    </p>
                    {nextWithSlots && (
                        <p className="text-[13.5px] text-muted-foreground first-letter:uppercase">
                            Tiene lugar el {formatDate(nextWithSlots.date)}
                        </p>
                    )}
                    <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                        {nextWithSlots && (
                            <Button
                                variant="outline"
                                onClick={() => onSelect(nextWithSlots.date, null)}
                                className="h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold"
                            >
                                Ir al próximo día con lugar
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={onSeeEmployees}
                            className="h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold"
                        >
                            Ver todos los profesionales
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
