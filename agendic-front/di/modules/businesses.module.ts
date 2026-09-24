import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
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

    return businessesModule;
}
