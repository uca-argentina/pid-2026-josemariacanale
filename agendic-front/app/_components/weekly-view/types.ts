import type { BookingStatus } from '@/src/entities/models/booking';

/** Evento de la grilla semanal. No conoce el Turno: quien la usa lo traduce a esto; `bookingUid` y `status` son solo datos que viajan con el evento. */
export interface CalendarEvent {
    id: number;
    title: string;
    description?: string;
    start: Date | string;
    end: Date;
    source?: string;
    options?: {
        status?: BookingStatus;
        hideTime?: boolean;
        allDay?: boolean;
        color?: string;
        className?: string;
        bookingUid?: string;
        'data-test-id'?: string;
        borderOnly?: boolean;
    };
}
