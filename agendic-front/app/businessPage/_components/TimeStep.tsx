'use client';

import { useMemo } from 'react';
import { CalendarX2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/app/_components/ui/avatar';
import { Button } from '@/app/_components/ui/button';
import { cn } from '@/app/_components/utils';
import { availableDays, employeesWithSlots, endTime, formatDate, initials } from './mock-business';
import type { Branch, Employee, Service } from './types';

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
    // La duración del Servicio decide qué horarios entran antes del cierre, y cada Empleado tiene
    // su propia agenda: los días se recalculan cuando cambia cualquiera de los dos.
    const days = useMemo(
        () => availableDays(service.durationMinutes, employee.id),
        [service.durationMinutes, employee.id],
    );

    const chosenDay = days.find((d) => d.date === date) ?? null;
    const nextWithSlots = days.find((d) => d.slots.length > 0);

    // Solo para el caso "este profesional está completo, pero otro puede atenderte".
    const alternatives = chosenDay
        ? employeesWithSlots(service, chosenDay.date).filter((e) => e.id !== employee.id)
        : [];

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
                                {day.dayOfMonth}
                            </button>
                            <span className="text-[12.5px] font-semibold text-muted-foreground">
                                {day.weekday}
                            </span>
                        </li>
                    );
                })}
            </ol>

            {!chosenDay && (
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

            {chosenDay?.reason === 'fully-booked' && (
                <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-border px-5 py-14 text-center">
                    <Avatar className="size-12">
                        <AvatarFallback className="bg-muted text-[14px] font-extrabold text-foreground">
                            {initials(employee.name)}
                        </AvatarFallback>
                    </Avatar>
                    <p className="mt-1 text-[17px] font-extrabold tracking-[-0.02em]">
                        {employee.name} no tiene horarios ese día
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
                    {alternatives.length > 0 && (
                        <p className="mt-4 max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
                            Ese día sí atiende{' '}
                            <span className="font-bold text-foreground">
                                {alternatives.map((e) => e.name).join(', ')}
                            </span>
                            .
                        </p>
                    )}
                </div>
            )}

            {chosenDay?.reason === 'branch-closed' && (
                <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input px-5 py-14 text-center">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                        <CalendarX2 className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold tracking-[-0.02em]">
                        La sucursal {branch.name} no atiende ese día
                    </p>
                    {nextWithSlots && (
                        <Button
                            variant="outline"
                            onClick={() => onSelect(nextWithSlots.date, null)}
                            className="mt-3 h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold"
                        >
                            Ir al próximo día con lugar
                        </Button>
                    )}
                </div>
            )}
        </>
    );
}
