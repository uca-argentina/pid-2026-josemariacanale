import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import { listBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import { getPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import { getMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import { updateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import { updateBusinessController } from '@/src/interface-adapters/controllers/businesses/update-business.controller';
import { BusinessesRepository } from '@/src/infrastructure/repositories/businesses.repository';
import { PublicBusinessRepository } from '@/src/infrastructure/repositories/public-business.repository';
import { createBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import { getPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';

export function createBusinessesModule() {
    const businessesModule = createModule();

    businessesModule.bind(DI_SYMBOLS.IBusinessesRepository).toClass(BusinessesRepository, [DI_SYMBOLS.IAuthenticationService]);
    businessesModule.bind(DI_SYMBOLS.IPublicBusinessRepository).toClass(PublicBusinessRepository);

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
        .bind(DI_SYMBOLS.IGetPublicBusinessUseCase)
        .toHigherOrderFunction(getPublicBusinessUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IPublicBusinessRepository,
        ]);

    businessesModule
        .bind(DI_SYMBOLS.IGetPublicBusinessController)
        .toHigherOrderFunction(getPublicBusinessController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IGetPublicBusinessUseCase,
        ]);

    return businessesModule;
}
