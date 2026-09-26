// Las formas que devuelve el back para la página pública, según docs/adr/0007-endpoints-de-la-api.md.
// Identificadores en inglés, uno por término del glosario (ADR 0003, docs/agents/domain.md).
//
// Los campos que el dominio NO tiene van marcados uno por uno con `ponytail:`. Hoy son tres:
// `Service.depositPercent`, `Booking.notes` y las fotos. El resto sale del contrato del back.

import type { ServiceCategoryValue } from '@/app/onboarding/_components/schemas';

/** GET /businesses/by-slug/:slug */
export interface Business {
    id: number;
    name: string;
    description: string;
    slug: string;
}

/** GET /businesses/:businessId/branches */
export interface Branch {
    id: number;
    businessId: number;
    name: string;
    address: string;
    /** 'HH:mm' */
    opensAt: string;
    /** 'HH:mm' */
    closesAt: string;
}

/** Lo único que la vista pública de un Servicio conoce de un Empleado: el email es solo del Dueño. */
export interface Employee {
    id: number;
    name: string;
}

/** GET /branches/:id/services: solo los Servicios activos (retiredAt null). */
export interface Service {
    id: number;
    branchId: number;
    name: string;
    description?: string;
    category: ServiceCategoryValue;
    durationMinutes: number;
    price: number;
    employees: Employee[];
    /**
     * ponytail: la Seña no existe en el dominio ni en el glosario. Porcentaje del precio que el
     * Negocio cobra por adelantado; sin valor, el Servicio no pide seña.
     */
    depositPercent?: number;
}

/** Por qué un día no tiene horarios: cada motivo se resuelve distinto desde la UI. */
export type NoSlotsReason = 'branch-closed' | 'fully-booked';

/** Un día de la tira del paso Horario. */
export interface AvailableDay {
    /** 'YYYY-MM-DD', la clave del día. */
    date: string;
    /** Número del día del mes, para el círculo de la tira. */
    dayOfMonth: number;
    /** 'Lun', 'Mar', … */
    weekday: string;
    /** 'HH:mm' libres, ya filtrados por duración del Servicio y por la agenda del Empleado. */
    slots: string[];
    /** Presente solo cuando `slots` está vacío. */
    reason?: NoSlotsReason;
}

/**
 * Lo que el Cliente lleva elegido. `POST /bookings` necesita serviceId + employeeId + startsAt
 * + clientName + clientEmail; acá la fecha y la hora viajan separadas porque la UI las elige
 * en dos gestos, y se unen recién al reservar.
 */
export interface BookingDraft {
    service: Service | null;
    employee: Employee | null;
    date: string | null;
    time: string | null;
}

/**
 * Un Turno ya reservado, como lo muestra Mis turnos. `UNVERIFIED` es el estado en que nace
 * (ADR 0005): hasta que el Cliente verifica su email, el Turno no le reserva el horario.
 */
export interface Booking {
    id: string;
    business: Business;
    branch: Branch;
    service: Service;
    employee: Employee;
    /** 'YYYY-MM-DD' */
    date: string;
    /** 'HH:mm' */
    time: string;
    status: 'UNVERIFIED' | 'BOOKED';
    /** El Cliente no tiene cuenta (ADR 0005): sus datos viven en el Turno. */
    client: { name: string; email: string };
    /** ponytail: Booking no tiene campo de notas en el schema. */
    notes?: string;
    /** ponytail: ni Business ni Branch tienen campo de imagen; es un placeholder. */
    photo: string;
}

export const STEPS = ['service', 'employee', 'time', 'confirm'] as const;
export type Step = (typeof STEPS)[number];
