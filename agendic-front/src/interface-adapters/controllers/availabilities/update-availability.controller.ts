import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { confirmedUpdateAvailabilitySchema } from '@/src/entities/models/availability';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IUpdateAvailabilityController = ReturnType<typeof updateAvailabilityController>;

/**
 * Reemplaza nombre, zona horaria, Franjas y Anulaciones de unas Horas laborables y cancela los Turnos que confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el cuerpo no es válido
 * @throws {NotFoundError} la Availability no existe o no es del Usuario
 * @throws {AvailabilityRuleError} Franjas inválidas o solapadas, o zona horaria inválida
 * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera
 */
export const updateAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateAvailabilityUseCase: IUpdateAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<{ cancelledBookings: number }> =>
        instrumentationService.startSpan({ name: 'updateAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = confirmedUpdateAvailabilitySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Availability', { cause: error });
            const { cancelledBookings } = await updateAvailabilityUseCase(data);
            return { cancelledBookings };
        });
