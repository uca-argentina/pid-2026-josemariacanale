import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { assignEmployeeUseCase } from '@/src/application/use-cases/services/assign-employee.use-case';
import { createServiceUseCase } from '@/src/application/use-cases/services/create-service.use-case';
import { getMyServiceUseCase } from '@/src/application/use-cases/services/get-my-service.use-case';
import { listMyServicesUseCase } from '@/src/application/use-cases/services/list-my-services.use-case';
import { removeEmployeeUseCase } from '@/src/application/use-cases/services/remove-employee.use-case';
import { retireServiceUseCase } from '@/src/application/use-cases/services/retire-service.use-case';
import { updateServiceUseCase } from '@/src/application/use-cases/services/update-service.use-case';
import { ServicesRepository } from '@/src/infrastructure/repositories/services.repository';
import { assignEmployeeController } from '@/src/interface-adapters/controllers/services/assign-employee.controller';
import { createServiceController } from '@/src/interface-adapters/controllers/services/create-service.controller';
import { getMyServiceController } from '@/src/interface-adapters/controllers/services/get-my-service.controller';
import { listMyServicesController } from '@/src/interface-adapters/controllers/services/list-my-services.controller';
import { removeEmployeeController } from '@/src/interface-adapters/controllers/services/remove-employee.controller';
import { retireServiceController } from '@/src/interface-adapters/controllers/services/retire-service.controller';
import { updateServiceController } from '@/src/interface-adapters/controllers/services/update-service.controller';

/** The panel's Servicios: the catalog, the alta, the detail, the edit, the baja and who offers each one. */
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
            DI_SYMBOLS.IListEmployeesUseCase,
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

    servicesModule
        .bind(DI_SYMBOLS.IAssignEmployeeUseCase)
        .toHigherOrderFunction(assignEmployeeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IServicesRepository]);

    servicesModule
        .bind(DI_SYMBOLS.IAssignEmployeeController)
        .toHigherOrderFunction(assignEmployeeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IAssignEmployeeUseCase,
        ]);

    servicesModule
        .bind(DI_SYMBOLS.IRemoveEmployeeUseCase)
        .toHigherOrderFunction(removeEmployeeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IServicesRepository]);

    servicesModule
        .bind(DI_SYMBOLS.IRemoveEmployeeController)
        .toHigherOrderFunction(removeEmployeeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRemoveEmployeeUseCase,
        ]);

    return servicesModule;
}
