import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRescheduleBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-booking.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ bookingId: z.number().int().positive(), startsAt: z.iso.datetime() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IRescheduleBookingController = ReturnType<typeof rescheduleBookingController>;

/**
 * Reagenda un Turno aceptado al Horario reservable elegido.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` o `startsAt` no son válidos
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {SlotTakenError} el horario choca con otro Turno del Empleado
 * @throws {BookingStateError} el Turno no está aceptado
 */
export const rescheduleBookingController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        rescheduleBookingUseCase: IRescheduleBookingUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'rescheduleBooking Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await rescheduleBookingUseCase(data);
        });
