// Las formas que la página de la Sucursal recibe por props: la salida del presenter de
// getPublicBranchController, así el server nunca baja más de lo que la página muestra.
// Identificadores en inglés, uno por término del glosario (ADR 0003, docs/agents/domain.md).

import type { DI_RETURN_TYPES } from '@/di/types';

export type PublicBranchPage = Awaited<ReturnType<DI_RETURN_TYPES['IGetPublicBranchController']>>;

export type Business = PublicBranchPage['business'];
export type Branch = PublicBranchPage['branch'];
/** Las demás Sucursales del mismo Negocio, con su tramo del Enlace de reserva. */
export type OtherBranch = PublicBranchPage['otherBranches'][number];
/** Solo los Servicios activos. `depositPercent` es la Seña; `null`, sin Seña. */
export type Service = PublicBranchPage['services'][number];
/** Lo único que la vista pública conoce de un Empleado: el email es solo del Dueño. */
export type Employee = PublicBranchPage['employees'][number];

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
    /** Comentario del Turno. */
    notes?: string;
    /** ponytail: foto placeholder hasta el ticket 06 (Imágenes de Sucursal). */
    photo: string;
}

export const STEPS = ['service', 'employee', 'time', 'confirm'] as const;
export type Step = (typeof STEPS)[number];
