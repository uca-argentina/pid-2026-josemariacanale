import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createBranchUseCase } from '@/src/application/use-cases/branches/create-branch.use-case';
import { listBranchesWithImagesUseCase } from '@/src/application/use-cases/branches/list-branches-with-images.use-case';
import { updateBranchUseCase } from '@/src/application/use-cases/branches/update-branch.use-case';
import { getTimeZoneUseCase } from '@/src/application/use-cases/branches/get-time-zone.use-case';
import { BranchesRepository } from '@/src/infrastructure/repositories/branches.repository';
import { TimeZoneService } from '@/src/infrastructure/services/time-zone.service';
import { getTimeZoneController } from '@/src/interface-adapters/controllers/branches/get-time-zone.controller';
import { createBranchController } from '@/src/interface-adapters/controllers/branches/create-branch.controller';
import { listBranchesWithImagesController } from '@/src/interface-adapters/controllers/branches/list-branches-with-images.controller';
import { updateBranchController } from '@/src/interface-adapters/controllers/branches/update-branch.controller';

export function createBranchesModule() {
    const branchesModule = createModule();

    branchesModule.bind(DI_SYMBOLS.IBranchesRepository).toClass(BranchesRepository, [DI_SYMBOLS.IAuthenticationService]);

    branchesModule
        .bind(DI_SYMBOLS.ICreateBranchUseCase)
        .toHigherOrderFunction(createBranchUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBranchesRepository]);
    branchesModule
        .bind(DI_SYMBOLS.ICreateBranchController)
        .toHigherOrderFunction(createBranchController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICreateBranchUseCase,
        ]);

    branchesModule
        .bind(DI_SYMBOLS.IUpdateBranchUseCase)
        .toHigherOrderFunction(updateBranchUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBranchesRepository]);
    branchesModule
        .bind(DI_SYMBOLS.IUpdateBranchController)
        .toHigherOrderFunction(updateBranchController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateBranchUseCase,
        ]);

    // Listing reuses the public GETs, so it reads through the public repository.
    branchesModule
        .bind(DI_SYMBOLS.IListBranchesWithImagesUseCase)
        .toHigherOrderFunction(listBranchesWithImagesUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IPublicBusinessesRepository,
        ]);
    branchesModule
        .bind(DI_SYMBOLS.IListBranchesWithImagesController)
        .toHigherOrderFunction(listBranchesWithImagesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListBranchesWithImagesUseCase,
        ]);

    branchesModule.bind(DI_SYMBOLS.ITimeZoneService).toClass(TimeZoneService);
    branchesModule
        .bind(DI_SYMBOLS.IGetTimeZoneUseCase)
        .toHigherOrderFunction(getTimeZoneUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ITimeZoneService]);
    branchesModule
        .bind(DI_SYMBOLS.IGetTimeZoneController)
        .toHigherOrderFunction(getTimeZoneController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetTimeZoneUseCase,
        ]);

    return branchesModule;
}
