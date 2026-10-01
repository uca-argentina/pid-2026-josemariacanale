import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createServiceUseCase } from '@/src/application/use-cases/services/create-service.use-case';
import { getMyServiceUseCase } from '@/src/application/use-cases/services/get-my-service.use-case';
import { listMyServicesUseCase } from '@/src/application/use-cases/services/list-my-services.use-case';
import { retireServiceUseCase } from '@/src/application/use-cases/services/retire-service.use-case';
import { updateServiceUseCase } from '@/src/application/use-cases/services/update-service.use-case';
import { ServicesRepository } from '@/src/infrastructure/repositories/services.repository';
import { createServiceController } from '@/src/interface-adapters/controllers/services/create-service.controller';
import { getMyServiceController } from '@/src/interface-adapters/controllers/services/get-my-service.controller';
import { listMyServicesController } from '@/src/interface-adapters/controllers/services/list-my-services.controller';
import { retireServiceController } from '@/src/interface-adapters/controllers/services/retire-service.controller';
import { updateServiceController } from '@/src/interface-adapters/controllers/services/update-service.controller';

/** The panel's Servicios: the catalog, the alta, the detail, the edit and the baja. */
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

    servicesModule
        .bind(DI_SYMBOLS.IGetMyServiceUseCase)
        .toHigherOrderFunction(getMyServiceUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IServicesRepository]);

    servicesModule
        .bind(DI_SYMBOLS.IGetMyServiceController)
        .toHigherOrderFunction(getMyServiceController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetMyServiceUseCase,
        ]);

    servicesModule
        .bind(DI_SYMBOLS.IUpdateServiceUseCase)
        .toHigherOrderFunction(updateServiceUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IServicesRepository]);

    servicesModule
        .bind(DI_SYMBOLS.IUpdateServiceController)
        .toHigherOrderFunction(updateServiceController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateServiceUseCase,
        ]);

    servicesModule
        .bind(DI_SYMBOLS.IRetireServiceUseCase)
        .toHigherOrderFunction(retireServiceUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IServicesRepository]);

    servicesModule
        .bind(DI_SYMBOLS.IRetireServiceController)
        .toHigherOrderFunction(retireServiceController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRetireServiceUseCase,
        ]);

    return servicesModule;
}
