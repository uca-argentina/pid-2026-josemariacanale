import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createServiceUseCase } from '@/src/application/use-cases/services/create-service.use-case';
import { listMyServicesUseCase } from '@/src/application/use-cases/services/list-my-services.use-case';
import { ServicesRepository } from '@/src/infrastructure/repositories/services.repository';
import { createServiceController } from '@/src/interface-adapters/controllers/services/create-service.controller';
import { listMyServicesController } from '@/src/interface-adapters/controllers/services/list-my-services.controller';

/** The panel's Servicios: the catalog and the alta. */
export function createServicesModule() {
    const servicesModule = createModule();

    servicesModule.bind(DI_SYMBOLS.IServicesRepository).toClass(ServicesRepository, [DI_SYMBOLS.IAuthenticationService]);

    servicesModule
        .bind(DI_SYMBOLS.IListMyServicesUseCase)
        .toHigherOrderFunction(listMyServicesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IServicesRepository]);

    servicesModule
        .bind(DI_SYMBOLS.ICreateServiceUseCase)
        .toHigherOrderFunction(createServiceUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IServicesRepository]);

    servicesModule
        .bind(DI_SYMBOLS.IListMyServicesController)
        .toHigherOrderFunction(listMyServicesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListMyServicesUseCase,
        ]);

    servicesModule
        .bind(DI_SYMBOLS.ICreateServiceController)
        .toHigherOrderFunction(createServiceController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICreateServiceUseCase,
        ]);

    return servicesModule;
}
