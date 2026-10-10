import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUploadBranchImageUseCase } from '@/src/application/use-cases/businesses/upload-branch-image.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { uploadBranchImageSchema, type BranchImage } from '@/src/entities/models/branch-image';

function presenter(image: BranchImage, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'uploadBranchImage Presenter', op: 'serialize' }, () => ({
        id: image.id,
        branchId: image.branchId,
        url: image.url,
        order: image.order,
    }));
}

export type IUploadBranchImageController = ReturnType<typeof uploadBranchImageController>;
/**
 * Sube una imagen a la Sucursal.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no es válido
 */
export const uploadBranchImageController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        uploadBranchImageUseCase: IUploadBranchImageUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'uploadBranchImage Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = uploadBranchImageSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await uploadBranchImageUseCase(data.branchId, data.file), instrumentationService);
        });
