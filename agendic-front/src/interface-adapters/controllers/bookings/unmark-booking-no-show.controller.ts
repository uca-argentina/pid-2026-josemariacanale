import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUnmarkBookingNoShowUseCase } from '@/src/application/use-cases/bookings/unmark-booking-no-show.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ bookingId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IUnmarkBookingNoShowController = ReturnType<typeof unmarkBookingNoShowController>;

/**
 * Desmarca la Ausencia del Invitado de un Turno aceptado, en cualquier momento.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` no es un id válido
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está aceptado o no tiene Ausencia del Invitado
 */
export const unmarkBookingNoShowController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        unmarkBookingNoShowUseCase: IUnmarkBookingNoShowUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'unmarkBookingNoShow Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await unmarkBookingNoShowUseCase(data.bookingId);
        });
