import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRejectBookingUseCase } from '@/src/application/use-cases/bookings/reject-booking.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ bookingId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IRejectBookingController = ReturnType<typeof rejectBookingController>;

/**
 * Rechaza un Turno pendiente; su horario queda libre.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` no es un id válido
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está pendiente
 */
export const rejectBookingController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        rejectBookingUseCase: IRejectBookingUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'rejectBooking Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await rejectBookingUseCase(data.bookingId);
        });
