import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDeleteBranchImageUseCase } from '@/src/application/use-cases/businesses/delete-branch-image.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { deleteBranchImageSchema } from '@/src/entities/models/branch-image';

export type IDeleteBranchImageController = ReturnType<typeof deleteBranchImageController>;
export const deleteBranchImageController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        deleteBranchImageUseCase: IDeleteBranchImageUseCase,
    ) =>
    async (input: unknown) =>
        instrumentationService.startSpan({ name: 'deleteBranchImage Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = deleteBranchImageSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await deleteBranchImageUseCase(data.branchId, data.imageId);
        });
