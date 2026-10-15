'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { listSlotsAction } from './actions';

const pillButton = 'h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold';

/**
 * Lo que el paso Horario muestra en un día `FULLY_BOOKED`: "No quedan horarios este día" y anotarse en la Lista de
 * espera. Con Empleado elegido (ADR 0026), antes consulta el mismo día sin `employeeId`: si el Servicio tiene
 * horarios con otro Empleado, sugiere Reservar con "cualquiera" y no ofrece anotarse; si no, ofrece anotarse
 * aclarando que el aviso no es de ese Empleado.
 */
export function FullDayPanel({
    serviceId,
    date,
    employeeName,
    employeeId,
    onJoinWaitlist,
    onBookWithAnyone,
    children,
}: {
    serviceId: number;
    date: string;
    employeeId?: number;
    employeeName?: string;
    onJoinWaitlist: () => void;
    onBookWithAnyone: () => void;
    /** Lo que sigue después, por ejemplo ir al próximo día con lugar. */
    children?: React.ReactNode;
}) {
    // Sin Empleado elegido el día ya es el del Servicio entero: no hay nada que consultar.
    const [serviceHasRoom, setServiceHasRoom] = useState<'loading' | 'yes' | 'no' | 'error'>(employeeId ? 'loading' : 'no');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!employeeId) return;
        let current = true;
        listSlotsAction({ serviceId, from: date, to: date }).then(
            (result) => {
                if (!current) return;
                if (!result.ok) return setServiceHasRoom('error');
                const day = result.days.find((d) => d.date === date);
                setServiceHasRoom(day && day.slots.length > 0 ? 'yes' : 'no');
            },
            () => current && setServiceHasRoom('error'),
        );
        return () => {
            current = false;
        };
    }, [serviceId, date, employeeId, attempt]);

    return (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-border px-5 py-14 text-center">
            <p className="text-[17px] font-extrabold tracking-[-0.02em]">No quedan horarios este día</p>

            {serviceHasRoom === 'loading' && (
                <p role="status" className="mt-2 flex items-center gap-2 text-[13.5px] text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Buscando con otros profesionales…
                </p>
            )}

            {serviceHasRoom === 'error' && (
                <div role="alert" className="mt-2 flex flex-col items-center gap-3">
                    <p className="text-[13.5px] text-muted-foreground">No pudimos revisar el resto del equipo. Intentá de nuevo.</p>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setServiceHasRoom('loading');
                            setAttempt((n) => n + 1);
                        }}
                        className={pillButton}
                    >
                        Reintentar
                    </Button>
                </div>
            )}

            {serviceHasRoom === 'yes' && (
                <div className="mt-2 flex flex-col items-center gap-3">
                    <p className="text-[13.5px] text-muted-foreground">
                        {employeeName} no tiene lugar ese día, pero otros profesionales sí.
                    </p>
                    <Button onClick={onBookWithAnyone} className={`${pillButton} bg-foreground text-white hover:bg-foreground/90`}>
                        Reservar con cualquiera
                    </Button>
                </div>
            )}

            {serviceHasRoom === 'no' && (
                <div className="mt-2 flex flex-col items-center gap-3">
                    {employeeId && (
                        <p className="text-[13.5px] text-muted-foreground">
                            El aviso no es de {employeeName}: te escribimos si se libera un horario con cualquier profesional.
                        </p>
                    )}
                    <Button onClick={onJoinWaitlist} className={`${pillButton} bg-foreground text-white hover:bg-foreground/90`}>
                        Anotarme en la Lista de espera
                    </Button>
                </div>
            )}

            {children && <div className="mt-4">{children}</div>}
        </div>
    );
}
