import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDeleteBusinessLogoUseCase } from '@/src/application/use-cases/businesses/delete-business-logo.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { deleteBusinessLogoSchema } from '@/src/entities/models/business';

export type IDeleteBusinessLogoController = ReturnType<typeof deleteBusinessLogoController>;
/**
 * Quita el Logo del Negocio.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no es válido
 */
export const deleteBusinessLogoController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        deleteBusinessLogoUseCase: IDeleteBusinessLogoUseCase,
    ) =>
    async (input: unknown) =>
        instrumentationService.startSpan({ name: 'deleteBusinessLogo Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = deleteBusinessLogoSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await deleteBusinessLogoUseCase(data.businessId);
        });
