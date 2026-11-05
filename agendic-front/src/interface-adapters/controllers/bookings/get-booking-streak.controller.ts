import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBookingStreakUseCase } from '@/src/application/use-cases/bookings/get-booking-streak.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { BookingStreak } from '@/src/entities/models/booking-streak';
import { presentBookingStreak } from '@/src/interface-adapters/presenters/booking-streak.presenter';

function presenter(streak: BookingStreak, timeZone: string, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getBookingStreak Presenter', op: 'serialize' }, () => presentBookingStreak(streak, timeZone));
}

const inputSchema = z.object({ bookingId: z.number().int().positive(), timeZone: z.string().min(1) });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetBookingStreakController = ReturnType<typeof getBookingStreakController>;

/**
 * El bloque Racha del detalle del Turno: la Racha del Cliente y hasta cuándo dura (los días, en `timeZone`), cuánto le
 * falta para la próxima Recompensa y sus Premios disponibles. Devuelve `null` si no hay nada que mostrar.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` no es un id válido o falta `timeZone`
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 */
export const getBookingStreakController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getBookingStreakUseCase: IGetBookingStreakUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getBookingStreak Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await getBookingStreakUseCase(data.bookingId), data.timeZone, instrumentationService);
        });
