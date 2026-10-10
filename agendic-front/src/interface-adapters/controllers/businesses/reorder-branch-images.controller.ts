import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IReorderBranchImagesUseCase } from '@/src/application/use-cases/businesses/reorder-branch-images.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { reorderBranchImagesSchema } from '@/src/entities/models/branch-image';

export type IReorderBranchImagesController = ReturnType<typeof reorderBranchImagesController>;
/**
 * Reordena las imágenes de la Sucursal.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no es válido
 */
export const reorderBranchImagesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        reorderBranchImagesUseCase: IReorderBranchImagesUseCase,
    ) =>
    async (input: unknown) =>
        instrumentationService.startSpan({ name: 'reorderBranchImages Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = reorderBranchImagesSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return reorderBranchImagesUseCase(data.branchId, data.imageIds);
        });
