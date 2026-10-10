'use client';

import { useEffect, useRef, useState } from 'react';
import { listSlotsAction } from './actions';
import { addDays, formatWeekRange, todayIn, weekIndexOf, weekStart } from './format';
import type { SlotDay } from './types';

const LOAD_ERROR = 'No pudimos cargar los horarios. Intentá de nuevo.';

/**
 * Los Horarios reservables de un Servicio de a una semana: la 0 arranca hoy y cada una corre siete días.
 *
 * Pide cada semana la primera vez que se muestra y la guarda, así que volver a una ya vista no la pide de nuevo.
 * El Servicio no puede cambiar bajo el mismo hook: quien lo usa lo monta con `key` por Servicio.
 *
 * @param initialDate la fecha con la que ya se venía, para abrir en su semana; solo se mira al montarse
 */
export function useSlotWeek(serviceId: number, initialDate: string | null) {
    const [today, setToday] = useState<string | null>(null);
    const [weeks, setWeeks] = useState<Record<number, SlotDay[]>>({});
    const [week, setWeek] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const initialDateRef = useRef(initialDate);
    const loaded = week in weeks;

    useEffect(() => {
        if (error || (today && loaded)) return;
        let current = true;
        const fail = () => current && setError(LOAD_ERROR);

        if (!today) {
            // Las fechas son de la zona de donde se atiende (la Sucursal, o la Availability de un Servicio personal), que
            // llega con la respuesta. Hoy ahí es ayer, hoy o mañana en UTC: se pide desde ayer y se descarta lo anterior.
            const from = addDays(todayIn('UTC'), -1);
            listSlotsAction({ serviceId, from, to: addDays(from, 8) }).then((result) => {
                if (!current) return;
                if (!result.ok) return setError(result.message);
                const first = todayIn(result.timeZone);
                const last = addDays(first, 6);
                setWeeks({ 0: result.days.filter((d) => d.date >= first && d.date <= last) });
                setToday(first);
                if (initialDateRef.current) setWeek(weekIndexOf(initialDateRef.current, first));
            }, fail);
        } else {
            const from = weekStart(today, week);
            listSlotsAction({ serviceId, from, to: addDays(from, 6) }).then((result) => {
                if (!current) return;
                if (!result.ok) return setError(result.message);
                setWeeks((all) => ({ ...all, [week]: result.days.filter((d) => d.date >= today) }));
            }, fail);
        }
        return () => {
            current = false;
        };
    }, [serviceId, today, week, loaded, error, attempt]);

    return {
        status: error ? ('error' as const) : today && loaded ? ('ready' as const) : ('loading' as const),
        message: error,
        week,
        /** Los días de la semana que se ve; vacío mientras carga. */
        days: weeks[week] ?? [],
        /** '10 – 16 de octubre'; vacío hasta saber qué día es hoy. */
        label: today ? formatWeekRange(weekStart(today, week)) : '',
        canGoBack: week > 0,
        goToWeek: (next: number) => {
            setError(null);
            setWeek(Math.max(0, next));
        },
        retry: () => {
            setError(null);
            setAttempt((a) => a + 1);
        },
        /** Descarta lo guardado y vuelve a pedir la semana que se ve, por ejemplo cuando un horario se ocupó. */
        reload: () => {
            setWeeks({});
            setError(null);
            setAttempt((a) => a + 1);
        },
    };
}
