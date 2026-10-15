import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/update-out-of-office.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { confirmedUpdateOutOfOfficeSchema } from '@/src/entities/models/out-of-office';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IUpdateOutOfOfficeController = ReturnType<typeof updateOutOfOfficeController>;

/**
 * Cambia un período Fuera de la oficina del Usuario con Sesión y cancela los Turnos que confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el id, las fechas, el Motivo, las notas o los ids de Turnos no son válidos
 * @throws {NotFoundError} el período no existe o no es del Usuario
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera
 */
export const updateOutOfOfficeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateOutOfOfficeUseCase: IUpdateOutOfOfficeUseCase,
    ) =>
    async (input: unknown): Promise<{ cancelledBookings: number }> =>
        instrumentationService.startSpan({ name: 'updateOutOfOffice Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = confirmedUpdateOutOfOfficeSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Fuera de la oficina', { cause: error });
            const { cancelledBookings } = await updateOutOfOfficeUseCase(data);
            return { cancelledBookings };
        });
