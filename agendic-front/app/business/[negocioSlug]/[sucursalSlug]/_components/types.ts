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
/** Imágenes de Sucursal, ya en el orden de la galería. */
export type BranchImage = PublicBranchPage['images'][number];

/** Un día de la tira del paso Horario, como lo devuelve listSlotsController. */
export type SlotDay = Awaited<ReturnType<DI_RETURN_TYPES['IListSlotsController']>>['days'][number];
/** Un Horario reservable: el instante que viaja a POST /bookings y su hora local en la Sucursal. */
export type Slot = SlotDay['slots'][number];

/**
 * Lo que el Cliente lleva elegido. `POST /bookings` necesita serviceId + startsAt
 * + clientName + clientEmail; el día se guarda aparte porque la UI lo elige antes que el horario.
 */
export interface BookingDraft {
    service: Service | null;
    date: string | null;
    slot: Slot | null;
}

/** Los datos que el Cliente escribió en Revisá y confirmá, para no perderlos si vuelve atrás. */
export interface ClientData {
    name: string;
    email: string;
    /** Comentario del Turno; vacío si no escribió nada. */
    notes: string;
}

/**
 * Un Turno recién reservado, como lo muestra Mis turnos. `status` es el estado real en que lo
 * creó el back: no siempre nace sin verificar.
 */
export interface Booking {
    id: number;
    business: Business;
    branch: Branch;
    service: Service;
    /** El nombre del Empleado que el back le asignó: el Cliente no lo elige. */
    employeeName: string | null;
    /** 'YYYY-MM-DD', local de la Sucursal. */
    date: string;
    /** 'HH:mm', local de la Sucursal. */
    time: string;
    status: Awaited<ReturnType<DI_RETURN_TYPES['IBookSlotController']>>['status'];
    /** El Cliente no tiene cuenta (ADR 0005): sus datos viven en el Turno. */
    client: { name: string; email: string };
    /** Comentario del Turno; `null` si no dejó ninguno. */
    notes: string | null;
    /** La Imagen de portada de la Sucursal; sin Imágenes, no hay. */
    coverUrl: string | undefined;
}

export const STEPS = ['service', 'time', 'confirm'] as const;
export type Step = (typeof STEPS)[number];
