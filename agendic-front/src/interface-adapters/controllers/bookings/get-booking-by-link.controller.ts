import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBookingByLinkUseCase } from '@/src/application/use-cases/bookings/get-booking-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getBookingByLink Presenter', op: 'serialize' }, () => ({
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

export type IGetBookingByLinkController = ReturnType<typeof getBookingByLinkController>;

/**
 * Abre el Turno de un Enlace del Turno, en cualquier estado.
 *
 * Público: el Enlace, no una Sesión ni un acceso, prueba que se tiene el Turno (ADR 0022).
 *
 * @throws {InputParseError} `link` falta o está vacío
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 */
export const getBookingByLinkController =
    (instrumentationService: IInstrumentationService, getBookingByLinkUseCase: IGetBookingByLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getBookingByLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await getBookingByLinkUseCase(data), instrumentationService);
        });
