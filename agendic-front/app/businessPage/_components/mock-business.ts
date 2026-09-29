import { SERVICE_CATEGORIES } from '@/app/_components/business-schemas';
import type { Business, Branch, Employee, Service } from './types';

// ponytail: todo este archivo es mock. Cuando existan las llamadas de docs/adr/0007-endpoints-de-la-api.md
// (GET /businesses/by-slug/:slug, /businesses/:id/branches, /branches/:id/services) se reemplaza por
// una llamada al controller, y la página pasa a recibir esto por props desde el server.

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
        timeZone: 'America/Argentina/Buenos_Aires',
    },
    {
        id: 2,
        businessId: 1,
        name: 'Palermo',
        address: 'Thames 1620, CABA',
        opensAt: '10:00',
        closesAt: '19:00',
        timeZone: 'America/Argentina/Buenos_Aires',
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
// Los horarios reservables reales se obtienen desde el back vía GET /services/:id/slots.

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;


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
