import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICancelBookingUseCase } from '@/src/application/use-cases/bookings/cancel-booking.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ bookingId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ICancelBookingController = ReturnType<typeof cancelBookingController>;

/**
 * Cancela un Turno aceptado; su horario queda libre.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` no es un id válido
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está aceptado
 */
export const cancelBookingController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        cancelBookingUseCase: ICancelBookingUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'cancelBooking Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await cancelBookingUseCase(data.bookingId);
        });
