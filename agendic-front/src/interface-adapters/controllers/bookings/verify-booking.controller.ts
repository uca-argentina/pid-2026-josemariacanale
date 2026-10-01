import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IVerifyBookingUseCase } from '@/src/application/use-cases/bookings/verify-booking.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Booking } from '@/src/entities/models/booking';

function presenter(booking: Booking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'verifyBooking Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
    }));
}

const inputSchema = z.object({ token: z.string().trim().min(1) });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IVerifyBookingController = ReturnType<typeof verifyBookingController>;

/**
 * Verifica el email del Cliente con el token del link del mail.
 *
 * Es público: el Cliente no tiene Sesión (ADR 0005).
 *
 * @throws {InputParseError} falta el token
 * @throws {BookingStateError} el token no existe, ya se usó o venció
 * @throws {SlotTakenError} el horario se ocupó mientras tanto
 */
export const verifyBookingController =
    (instrumentationService: IInstrumentationService, verifyBookingUseCase: IVerifyBookingUseCase) =>
    async (input: { token?: string }): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'verifyBooking Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid token', { cause: error });
            return presenter(await verifyBookingUseCase(data.token), instrumentationService);
        });
