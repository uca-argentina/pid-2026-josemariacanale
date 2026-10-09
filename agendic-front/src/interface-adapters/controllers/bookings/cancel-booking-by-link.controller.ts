import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICancelBookingByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'cancelBookingByLink Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        status: booking.status,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        timeZone: booking.timeZone,
        notes: booking.notes,
        clientName: booking.clientName,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        service: booking.service,
        employeeName: booking.employeeName,
        business: booking.business,
        branch: booking.branch,
        user: booking.user,
    }));
}

const inputSchema = z.object({ link: z.string().trim().min(1) });

export type ICancelBookingByLinkController = ReturnType<typeof cancelBookingByLinkController>;

/**
 * Cancela el Turno pendiente o aceptado de un Enlace del Turno; su horario queda libre.
 *
 * Público: el Enlace, no una Sesión ni un acceso, prueba que se tiene el Turno (ADR 0022).
 *
 * @throws {InputParseError} `link` falta o está vacío
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado, o ya empezó
 */
export const cancelBookingByLinkController =
    (instrumentationService: IInstrumentationService, cancelBookingByLinkUseCase: ICancelBookingByLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'cancelBookingByLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await cancelBookingByLinkUseCase(data), instrumentationService);
        });
