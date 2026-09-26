import { SERVICE_CATEGORIES } from '@/app/onboarding/_components/schemas';
import type { AvailableDay, Business, Branch, Employee, Service } from './types';

// ponytail: todo este archivo es mock. Cuando existan las llamadas de docs/adr/0007-endpoints-de-la-api.md
// (GET /businesses/by-slug/:slug, /businesses/:id/branches, /branches/:id/services) se reemplaza por
// una llamada al controller, y la página pasa a recibir esto por props desde el server.

// Fecha fija a propósito: la tira de días se renderiza en el server y se hidrata en el cliente,
// y `new Date()` da resultados distintos a cada lado.
const TODAY = '2026-09-28';

export const business: Business = {
    id: 1,
    name: 'Vitalia Centro de Bienestar',
    description:
        'Kinesiología, estética y entrenamiento en un mismo lugar. Atendemos con turno previo de lunes a sábado.',
    slug: 'vitalia',
};

export const branches: Branch[] = [
    {
        id: 1,
        businessId: 1,
        name: 'Centro',
        address: 'Av. Corrientes 1840, CABA',
        opensAt: '09:00',
        closesAt: '20:00',
    },
    {
        id: 2,
        businessId: 1,
        name: 'Palermo',
        address: 'Thames 1620, CABA',
        opensAt: '10:00',
        closesAt: '19:00',
    },
];

/** La Sucursal que esta página muestra. Más adelante sale del segmento de la URL. */
export const branch = branches[0];

const martina: Employee = { id: 1, name: 'Martina Falcón' };
const sofia: Employee = { id: 2, name: 'Sofía Ledesma' };
const nicolas: Employee = { id: 3, name: 'Nicolás Rivas' };
const camila: Employee = { id: 4, name: 'Camila Ortega' };

export const services: Service[] = [
    {
        id: 1,
        branchId: 1,
        name: 'Consulta inicial de kinesiología',
        description:
            'Primera evaluación: revisamos el motivo de consulta, medimos movilidad y armamos el plan de tratamiento.',
        category: 'CLINICA',
        durationMinutes: 45,
        price: 18000,
        depositPercent: 20,
        employees: [martina, nicolas],
    },
    {
        id: 2,
        branchId: 1,
        name: 'Control de seguimiento',
        description: 'Sesión de control para pacientes que ya tienen un plan en curso.',
        category: 'CLINICA',
        durationMinutes: 30,
        price: 11500,
        employees: [martina, nicolas],
    },
    {
        id: 3,
        branchId: 1,
        name: 'Evaluación integral',
        description:
            'Evaluación postural y funcional completa, con informe escrito y plan de ejercicios para casa.',
        category: 'CLINICA',
        durationMinutes: 60,
        price: 26000,
        depositPercent: 25,
        employees: [nicolas],
    },
    {
        id: 4,
        branchId: 1,
        name: 'Masaje descontracturante',
        description: 'Trabajo profundo sobre cervicales, espalda alta y zona lumbar.',
        category: 'SPA',
        durationMinutes: 60,
        price: 22000,
        depositPercent: 15,
        employees: [sofia, camila],
    },
    {
        id: 5,
        branchId: 1,
        name: 'Limpieza facial profunda',
        description: 'Incluye exfoliación, extracción y máscara según tipo de piel.',
        category: 'SPA',
        durationMinutes: 45,
        price: 16500,
        depositPercent: 20,
        employees: [camila],
    },
    {
        id: 6,
        branchId: 1,
        name: 'Drenaje linfático',
        category: 'SPA',
        durationMinutes: 50,
        price: 19000,
        employees: [sofia],
    },
    {
        id: 7,
        branchId: 1,
        name: 'Entrenamiento personalizado',
        description: 'Sesión uno a uno, con rutina adaptada al objetivo y al historial de lesiones.',
        category: 'GIMNASIO',
        durationMinutes: 60,
        price: 14000,
        employees: [nicolas, camila],
    },
    {
        id: 8,
        branchId: 1,
        name: 'Pilates reformer',
        description: 'Clase individual en camilla reformer.',
        category: 'GIMNASIO',
        durationMinutes: 50,
        price: 12500,
        employees: [sofia, camila],
    },
];

/** Las Categorías que esta Sucursal realmente ofrece, en el orden del enum. */
export const categories = SERVICE_CATEGORIES.filter((c) =>
    services.some((s) => s.category === c.value),
);

export const servicesByCategory = (category: string) =>
    services.filter((s) => s.category === category);

/** ponytail: fotos placeholder; ni Business ni Branch tienen campo de imagen. */
export const photos = [
    'https://picsum.photos/seed/vitalia-centro-recepcion/1200/900',
    'https://picsum.photos/seed/vitalia-centro-camilla/800/600',
    'https://picsum.photos/seed/vitalia-centro-sala/800/600',
];

// --- Horarios -------------------------------------------------------------
// ponytail: no hay endpoint de disponibilidad en ADR 0007. Los horarios salen de la franja de la
// Sucursal, y la agenda de cada Empleado está puesta a mano para que se vean los tres casos:
// día con lugar, Empleado con la agenda completa, y Sucursal cerrada.

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

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Los siete días siguientes a la fecha fija, con los horarios en que entra un Servicio de esa
 * duración dentro de la franja de la Sucursal y en la agenda de ese Empleado.
 */
export function availableDays(durationMinutes: number, employeeId: number): AvailableDay[] {
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
export function employeesWithSlots(service: Service, date: string) {
    return service.employees.filter((e) =>
        availableDays(service.durationMinutes, e.id).some(
            (d) => d.date === date && d.slots.length > 0,
        ),
    );
}

// --- Formato --------------------------------------------------------------
// Locale y zona explícitos: sin eso el server y el cliente pueden formatear distinto.

const THOUSANDS = new Intl.NumberFormat('es-AR');

export const formatPrice = (price: number) => `$${THOUSANDS.format(price)}`;

export function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
}

const LONG_DATE = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
});

/** 'sábado 3 de octubre' */
export const formatDate = (date: string) => LONG_DATE.format(new Date(`${date}T00:00:00Z`));

/** El horario de fin de un Turno, para mostrar '10:15 a 11:00'. */
export function endTime(time: string, durationMinutes: number) {
    return toTime(toMinutes(time) + durationMinutes);
}

/**
 * ponytail: la Seña no existe en el dominio ni en el glosario (CONTEXT.md). Lo que el Cliente
 * adelanta y lo que queda para pagar en el local; `null` cuando el Servicio no pide seña.
 */
export function depositFor(service: Service) {
    if (!service.depositPercent) return null;
    const upfront = Math.round((service.price * service.depositPercent) / 100);
    return { percent: service.depositPercent, upfront, rest: service.price - upfront };
}

/** Iniciales para el avatar, igual que en el panel. */
export function initials(name: string) {
    return name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}
