import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDeleteOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/delete-out-of-office.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ outOfOfficeId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IDeleteOutOfOfficeController = ReturnType<typeof deleteOutOfOfficeController>;

/**
 * Borra un período Fuera de la oficina del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el id no es válido
 * @throws {NotFoundError} el período no existe o no es del Usuario
 */
export const deleteOutOfOfficeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        deleteOutOfOfficeUseCase: IDeleteOutOfOfficeUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteOutOfOffice Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Fuera de la oficina id', { cause: error });
            await deleteOutOfOfficeUseCase(data.outOfOfficeId);
        });
