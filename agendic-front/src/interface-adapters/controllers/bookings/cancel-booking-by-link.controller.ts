import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICancelBookingByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';
import { presentClientBooking } from '@/src/interface-adapters/presenters/client-booking.presenter';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'cancelBookingByLink Presenter', op: 'serialize' }, () => presentClientBooking(booking));
}

const inputSchema = z.object({ link: z.string().trim().min(1), reason: z.string().optional() });

export type ICancelBookingByLinkController = ReturnType<typeof cancelBookingByLinkController>;

/**
 * Cancela el Turno pendiente o aceptado de un Enlace del Turno; su horario queda libre.
 *
 * Público: el Enlace, no una Sesión ni un acceso, prueba que se tiene el Turno (ADR 0022).
 *
 * @throws {InputParseError} `link` falta o está vacío, o `reason` no es texto
 * @throws {CancellationReasonTooLongError} el Motivo de cancelación es demasiado largo
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
