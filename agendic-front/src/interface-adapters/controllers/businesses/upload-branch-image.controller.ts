import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUploadBranchImageUseCase } from '@/src/application/use-cases/businesses/upload-branch-image.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { uploadBranchImageSchema } from '@/src/entities/models/branch-image';

export type IUploadBranchImageController = ReturnType<typeof uploadBranchImageController>;
export const uploadBranchImageController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        uploadBranchImageUseCase: IUploadBranchImageUseCase,
    ) =>
    async (input: unknown) =>
        instrumentationService.startSpan({ name: 'uploadBranchImage Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = uploadBranchImageSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return uploadBranchImageUseCase(data.branchId, data.file);
        });
