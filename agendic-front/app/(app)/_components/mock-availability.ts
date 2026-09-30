import { DAY_NAMES, type AvailabilityInterval } from '@/app/(app)/_components/availability-week';

export { DAY_NAMES, type AvailabilityInterval };

// ponytail: los datos de este archivo son mock. Cuando exista el dominio de Availability en src/, la página los
// recibe por props desde un controller, y las reglas (`invalidIntervals`, `nextInterval`, `setOverrides`) pasan
// a src/entities y a los use cases.

/** Una Anulación: reemplaza las Franjas de una fecha (`YYYY-MM-DD`). Sin Franjas es día libre. */
export interface AvailabilityOverride {
    date: string;
    intervals: AvailabilityInterval[];
}

/** Horas laborables con nombre de un Empleado. `days[0]` es el lunes y `days[6]` el domingo. */
export interface Availability {
    id: string;
    name: string;
    isDefault: boolean;
    days: AvailabilityInterval[][];
    overrides: AvailabilityOverride[];
}

export const myAvailabilities: Availability[] = [
    {
        id: 'laboral',
        name: 'Horario laboral',
        isDefault: true,
        days: DAY_NAMES.map((_, i) => (i < 5 ? [['09:00', '17:00']] : [])),
        overrides: [
            { date: '2026-10-12', intervals: [] },
            { date: '2026-10-23', intervals: [['09:00', '13:00']] },
        ],
    },
    {
        id: 'tarde',
        name: 'Horario de tarde',
        isDefault: false,
        days: [
            [['08:00', '13:00'], ['17:00', '20:00']],
            [['14:00', '20:00']],
            [['14:00', '20:00']],
            [['08:00', '13:00'], ['17:00', '20:00']],
            [['14:00', '20:00']],
            [['10:00', '13:00']],
            [],
        ],
        overrides: [],
    },
    // Ningún Servicio la usa: es la única que se puede eliminar sin aviso.
    { id: 'sabados', name: 'Sábados', isDefault: false, days: [[], [], [], [], [], [['10:00', '14:00']], []], overrides: [] },
];
