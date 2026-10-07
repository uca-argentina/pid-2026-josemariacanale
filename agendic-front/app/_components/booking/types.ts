// Las formas que el flujo de Reservar recibe por props, el mismo para la página de una Sucursal y la de un Usuario
// (ADR 0021). Identificadores en inglés, uno por término del glosario (ADR 0003, docs/agents/domain.md).

import type { DI_RETURN_TYPES } from '@/di/types';
import type { ServiceCategoryValue } from '@/app/_components/business-schemas';

/**
 * Quién recibe el Turno, como lo muestran la reserva y Mis turnos: el Negocio en una de sus Sucursales, o el Usuario
 * de un Servicio personal.
 */
export interface Host {
    name: string;
    /** Dónde se atiende; null en un Servicio personal, que no tiene Sucursal. */
    branch: { name: string; address: string } | null;
}

/** Un Servicio que se puede Reservar. `depositPercent` es la Seña; `null`, sin Seña. */
export interface Service {
    id: number;
    name: string;
    description: string | null;
    category: ServiceCategoryValue;
    durationMinutes: number;
    price: number;
    depositPercent: number | null;
}

/** Un día de la tira del paso Horario, como lo devuelve listSlotsController. */
export type SlotDay = Awaited<ReturnType<DI_RETURN_TYPES['IListSlotsController']>>['days'][number];
/** Un Horario reservable: el instante que viaja a POST /bookings y su hora local donde se atiende. */
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

export const STEPS = ['service', 'time', 'confirm'] as const;
export type Step = (typeof STEPS)[number];
