import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import { listBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import { getMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import { BusinessesRepository } from '@/src/infrastructure/repositories/businesses.repository';
import { createBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';

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

    return businessesModule;
}
