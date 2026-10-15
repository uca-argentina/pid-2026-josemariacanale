import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICancelBookingSeriesByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-series-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { CancelledSeries } from '@/src/entities/models/client-booking';
import { presentClientBooking } from '@/src/interface-adapters/presenters/client-booking.presenter';

/** El Turno del Enlace, ya cancelado (el primero de `cancelled`), y cuándo son los que quedaron en pie. */
function presenter({ cancelled, kept }: CancelledSeries, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'cancelBookingSeriesByLink Presenter', op: 'serialize' }, () => ({
        booking: presentClientBooking(cancelled[0]),
        kept: kept.map((b) => ({ startsAt: b.startsAt })),
    }));
}

const inputSchema = z.object({ link: z.string().trim().min(1), reason: z.string().optional() });

export type ICancelBookingSeriesByLinkController = ReturnType<typeof cancelBookingSeriesByLinkController>;

/**
 * Cancela el Turno de un Enlace del Turno y los siguientes de su Serie: "este y los siguientes".
 *
 * Público: el Enlace, no una Sesión ni un acceso, prueba que se tiene el Turno (ADR 0022).
 *
 * @throws {InputParseError} `link` falta o está vacío, o `reason` no es texto
 * @throws {CancellationReasonTooLongError} el Motivo de cancelación es demasiado largo
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no se puede Cancelar, o no es de una Serie
 */
export const cancelBookingSeriesByLinkController =
    (instrumentationService: IInstrumentationService, cancelBookingSeriesByLinkUseCase: ICancelBookingSeriesByLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'cancelBookingSeriesByLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await cancelBookingSeriesByLinkUseCase(data), instrumentationService);
        });
