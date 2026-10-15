import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/create-out-of-office.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { confirmedOutOfOfficeSchema } from '@/src/entities/models/out-of-office';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type ICreateOutOfOfficeController = ReturnType<typeof createOutOfOfficeController>;

/**
 * Crea un período Fuera de la oficina del Usuario con Sesión y cancela los Turnos que confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} las fechas, el Motivo, las notas o los ids de Turnos no son válidos
 * @throws {OutOfOfficeRuleError} la fecha de fin es anterior a la de inicio
 * @throws {OutOfOfficeConflictError} ya hay un período con esas fechas
 * @throws {LeftOutsideBookingsChangedError} cambió la lista de Turnos que quedan afuera
 */
export const createOutOfOfficeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createOutOfOfficeUseCase: ICreateOutOfOfficeUseCase,
    ) =>
    async (input: unknown): Promise<{ cancelledBookings: number }> =>
        instrumentationService.startSpan({ name: 'createOutOfOffice Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = confirmedOutOfOfficeSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Fuera de la oficina', { cause: error });
            const { cancelledBookings } = await createOutOfOfficeUseCase(data);
            return { cancelledBookings };
        });
