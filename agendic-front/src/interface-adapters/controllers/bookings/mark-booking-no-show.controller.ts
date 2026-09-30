import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMarkBookingNoShowUseCase } from '@/src/application/use-cases/bookings/mark-booking-no-show.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ bookingId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IMarkBookingNoShowController = ReturnType<typeof markBookingNoShowController>;

/**
 * Marca la Ausencia de un Turno aceptado cuyo horario ya pasó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` no es un id válido
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está aceptado, su horario no pasó o ya tiene Ausencia
 */
export const markBookingNoShowController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        markBookingNoShowUseCase: IMarkBookingNoShowUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'markBookingNoShow Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await markBookingNoShowUseCase(data.bookingId);
        });
