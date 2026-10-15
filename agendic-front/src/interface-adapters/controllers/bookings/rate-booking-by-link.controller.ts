import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRateBookingByLinkUseCase } from '@/src/application/use-cases/bookings/rate-booking-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';
import { presentClientBooking } from '@/src/interface-adapters/presenters/client-booking.presenter';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'rateBookingByLink Presenter', op: 'serialize' }, () => presentClientBooking(booking));
}

/** Un comentario en blanco es no dejar comentario. */
const inputSchema = z.object({
    link: z.string().trim().min(1),
    score: z.number().int().min(1).max(5),
    comment: z
        .string()
        .trim()
        .max(500)
        .optional()
        .transform((comment) => comment || undefined),
});

export type IRateBookingByLinkController = ReturnType<typeof rateBookingByLinkController>;

/**
 * Califica el Turno de un Enlace del Turno de 1 a 5, con un comentario opcional de hasta 500 caracteres.
 *
 * Público: el Enlace, no una Sesión ni un acceso, prueba que se tiene el Turno (ADR 0022).
 *
 * @throws {InputParseError} `link` falta o está vacío, `score` no es un entero de 1 a 5, o `comment` pasa de 500 caracteres
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no se puede calificar
 * @throws {BookingAlreadyRatedError} el Turno ya tiene su Calificación
 */
export const rateBookingByLinkController =
    (instrumentationService: IInstrumentationService, rateBookingByLinkUseCase: IRateBookingByLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'rateBookingByLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await rateBookingByLinkUseCase(data), instrumentationService);
        });
