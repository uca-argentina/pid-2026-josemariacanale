import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import { listBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import { getMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import { updateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import { updateBusinessController } from '@/src/interface-adapters/controllers/businesses/update-business.controller';
import { BusinessesRepository } from '@/src/infrastructure/repositories/businesses.repository';
import { createBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import { PublicBusinessesRepository } from '@/src/infrastructure/repositories/public-businesses.repository';
import { getPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import { getPublicBranchUseCase } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import { getPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import { getPublicBranchController } from '@/src/interface-adapters/controllers/businesses/get-public-branch.controller';
import { uploadBranchImageUseCase } from '@/src/application/use-cases/businesses/upload-branch-image.use-case';
import { uploadBranchImageController } from '@/src/interface-adapters/controllers/businesses/upload-branch-image.controller';
import { deleteBranchImageUseCase } from '@/src/application/use-cases/businesses/delete-branch-image.use-case';
import { deleteBranchImageController } from '@/src/interface-adapters/controllers/businesses/delete-branch-image.controller';
import { reorderBranchImagesUseCase } from '@/src/application/use-cases/businesses/reorder-branch-images.use-case';
import { reorderBranchImagesController } from '@/src/interface-adapters/controllers/businesses/reorder-branch-images.controller';

export function createBusinessesModule() {
    const businessesModule = createModule();

    businessesModule.bind(DI_SYMBOLS.IBusinessesRepository).toClass(BusinessesRepository, [DI_SYMBOLS.IAuthenticationService]);

    businessesModule
        .bind(DI_SYMBOLS.ICreateBusinessUseCase)
        .toHigherOrderFunction(createBusinessUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.ICreateBusinessController)
        .toHigherOrderFunction(createBusinessController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICreateBusinessUseCase,
        ]);

    businessesModule
        .bind(DI_SYMBOLS.IListBusinessesUseCase)
        .toHigherOrderFunction(listBusinessesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.IGetMyBusinessController)
        .toHigherOrderFunction(getMyBusinessController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListBusinessesUseCase,
        ]);

    businessesModule
        .bind(DI_SYMBOLS.IUpdateBusinessUseCase)
        .toHigherOrderFunction(updateBusinessUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.IUpdateBusinessController)
        .toHigherOrderFunction(updateBusinessController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateBusinessUseCase,
        ]);

    businessesModule
        .bind(DI_SYMBOLS.IUploadBranchImageUseCase)
        .toHigherOrderFunction(uploadBranchImageUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.IUploadBranchImageController)
        .toHigherOrderFunction(uploadBranchImageController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUploadBranchImageUseCase,
        ]);

    businessesModule
        .bind(DI_SYMBOLS.IDeleteBranchImageUseCase)
        .toHigherOrderFunction(deleteBranchImageUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.IDeleteBranchImageController)
        .toHigherOrderFunction(deleteBranchImageController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IDeleteBranchImageUseCase,
        ]);

    businessesModule
        .bind(DI_SYMBOLS.IReorderBranchImagesUseCase)
        .toHigherOrderFunction(reorderBranchImagesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.IReorderBranchImagesController)
        .toHigherOrderFunction(reorderBranchImagesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IReorderBranchImagesUseCase,
        ]);

    // The page of the Enlace de reserva: public, so its repository takes no IAuthenticationService.
    businessesModule.bind(DI_SYMBOLS.IPublicBusinessesRepository).toClass(PublicBusinessesRepository);

    businessesModule
        .bind(DI_SYMBOLS.IGetPublicBusinessUseCase)
        .toHigherOrderFunction(getPublicBusinessUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IPublicBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.IGetPublicBusinessController)
        .toHigherOrderFunction(getPublicBusinessController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IGetPublicBusinessUseCase]);

    businessesModule
        .bind(DI_SYMBOLS.IGetPublicBranchUseCase)
        .toHigherOrderFunction(getPublicBranchUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IPublicBusinessesRepository]);

    businessesModule
        .bind(DI_SYMBOLS.IGetPublicBranchController)
        .toHigherOrderFunction(getPublicBranchController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IGetPublicBranchUseCase]);

    return businessesModule;
}
