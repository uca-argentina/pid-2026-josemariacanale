import { toMinutes, toTime } from './format';
import type { AvailableDay, Branch, Service } from './types';

// ponytail: los Horarios reservables siguen siendo mock hasta el ticket 07, que los pide a
// GET /services/:id/slots. Salen de la franja de la Sucursal, y la agenda de cada Empleado está
// puesta a mano (por id) para que se vean los tres casos: día con lugar, Empleado con la agenda
// completa, y Sucursal cerrada. Un Empleado real con otro id tiene todos los horarios libres.

// Fecha fija a propósito: la tira de días se renderiza en el server y se hidrata en el cliente,
// y `new Date()` da resultados distintos a cada lado.
const TODAY = '2026-09-28';

const MINUTES_BETWEEN_SLOTS = 15;

/** Días en que la Sucursal no atiende: ningún Empleado tiene horarios. */
const CLOSED = new Set([3]);

/** Índices de día en que el Empleado ya no tiene un solo hueco libre. */
const FULLY_BOOKED: Record<number, number[]> = {
    1: [0, 5],
    2: [2],
    3: [4],
    4: [1, 6],
};

/** Horarios ya tomados, por Empleado y por índice de día. Lo que falta es día sin turnos. */
const TAKEN: Record<number, Record<number, string[]>> = {
    1: {
        1: ['09:00', '12:00', '12:15', '15:30', '18:00'],
        2: ['10:30', '11:00', '13:45', '16:00'],
        4: ['09:30', '10:00', '14:30'],
    },
    2: {
        0: ['09:00', '09:15', '11:30', '14:00', '16:45'],
        1: ['10:00', '13:30', '17:15'],
        4: ['09:00', '12:45', '15:00', '18:30'],
        5: ['11:15', '13:00', '16:30'],
    },
    3: {
        0: ['10:00', '10:15', '13:00', '17:30'],
        2: ['09:30', '14:15', '16:00', '19:00'],
        5: ['09:00', '12:30', '15:45'],
        6: ['11:00', '14:00', '18:15'],
    },
    4: {
        0: ['09:45', '12:00', '16:15'],
        2: ['10:00', '13:15', '17:00'],
        4: ['09:15', '11:45', '15:30', '18:45'],
        5: ['10:30', '14:45'],
    },
};

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type Hours = Pick<Branch, 'opensAt' | 'closesAt'>;

/**
 * Los siete días siguientes a la fecha fija, con los horarios en que entra un Servicio de esa
 * duración dentro de la franja de la Sucursal y en la agenda de ese Empleado.
 */
export function availableDays(branch: Hours, durationMinutes: number, employeeId: number): AvailableDay[] {
    const opens = toMinutes(branch.opensAt);
    const closes = toMinutes(branch.closesAt);
    const start = new Date(`${TODAY}T00:00:00Z`);

    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(start);
        day.setUTCDate(day.getUTCDate() + i);
        const base = {
            date: day.toISOString().slice(0, 10),
            dayOfMonth: day.getUTCDate(),
            weekday: WEEKDAYS[day.getUTCDay()],
        };

        if (CLOSED.has(i)) return { ...base, slots: [], reason: 'branch-closed' as const };
        if (FULLY_BOOKED[employeeId]?.includes(i)) {
            return { ...base, slots: [], reason: 'fully-booked' as const };
        }

        const taken = new Set(TAKEN[employeeId]?.[i] ?? []);
        const slots: string[] = [];
        for (let t = opens; t + durationMinutes <= closes; t += MINUTES_BETWEEN_SLOTS) {
            const time = toTime(t);
            if (!taken.has(time)) slots.push(time);
        }

        return { ...base, slots };
    });
}

/** Los otros Empleados del Servicio que sí tienen lugar ese día, para sugerir cambiar. */
export function employeesWithSlots(branch: Hours, service: Service, date: string) {
    return service.employees.filter((e) =>
        availableDays(branch, service.durationMinutes, e.id).some(
            (d) => d.date === date && d.slots.length > 0,
        ),
    );
}
