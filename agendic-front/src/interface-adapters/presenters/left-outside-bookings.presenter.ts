import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

/** Da forma a los Turnos que quedan afuera para el cliente; lo comparten todos los controllers de vista previa. */
export function leftOutsideBookingsPresenter(bookings: LeftOutsideBooking[]) {
    return bookings.map((b) => ({
        id: b.id,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        timeZone: b.timeZone,
        serviceName: b.serviceName,
        clientName: b.clientName,
        business: b.business && { id: b.business.id, name: b.business.name },
        branch: b.branch && { id: b.branch.id, name: b.branch.name },
        cancellationCause: b.cancellationCause,
        cancellationReason: b.cancellationReason,
    }));
}
