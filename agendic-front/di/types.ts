import type { IAvailabilityService } from '@/src/application/services/availability.service.interface';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availability/list-availabilities.use-case';
import type { ICreateAvailabilityUseCase } from '@/src/application/use-cases/availability/create-availability.use-case';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availability/update-availability.use-case';
import type { ISetDefaultAvailabilityUseCase } from '@/src/application/use-cases/availability/set-default-availability.use-case';
import type { IDeleteAvailabilityUseCase } from '@/src/application/use-cases/availability/delete-availability.use-case';
import type { IListAvailabilitiesController } from '@/src/interface-adapters/controllers/availability/list-availabilities.controller';
import type { ICreateAvailabilityController } from '@/src/interface-adapters/controllers/availability/create-availability.controller';
import type { IUpdateAvailabilityController } from '@/src/interface-adapters/controllers/availability/update-availability.controller';
import type { ISetDefaultAvailabilityController } from '@/src/interface-adapters/controllers/availability/set-default-availability.controller';
import type { IDeleteAvailabilityController } from '@/src/interface-adapters/controllers/availability/delete-availability.controller';
import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IGetMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import type { ICreateBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import type { IUpdateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import type { IUpdateBusinessController } from '@/src/interface-adapters/controllers/businesses/update-business.controller';
import type { ICreateBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import type { IGetCurrentUserController } from '@/src/interface-adapters/controllers/auth/get-current-user.controller';
import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { IAddEmployeeUseCase } from '@/src/application/use-cases/employees/add-employee.use-case';
import type { IRetireEmployeeUseCase } from '@/src/application/use-cases/employees/retire-employee.use-case';
import type { IListMyEmployeesController } from '@/src/interface-adapters/controllers/employees/list-my-employees.controller';
import type { IAddEmployeeController } from '@/src/interface-adapters/controllers/employees/add-employee.controller';
import type { IRetireEmployeeController } from '@/src/interface-adapters/controllers/employees/retire-employee.controller';

import type { IGetEmployeeOverridesUseCase } from '@/src/application/use-cases/employees/get-employee-overrides.use-case';
import type { IPutEmployeeOverrideUseCase } from '@/src/application/use-cases/employees/put-employee-override.use-case';
import type { IDeleteEmployeeOverrideUseCase } from '@/src/application/use-cases/employees/delete-employee-override.use-case';
import type { IGetEmployeeOverridesController } from '@/src/interface-adapters/controllers/employees/get-employee-overrides.controller';
import type { IPutEmployeeOverrideController } from '@/src/interface-adapters/controllers/employees/put-employee-override.controller';
import type { IDeleteEmployeeOverrideController } from '@/src/interface-adapters/controllers/employees/delete-employee-override.controller';

export const DI_SYMBOLS = {
    // Services
    IInstrumentationService: Symbol.for('IInstrumentationService'),
    ICrashReporterService: Symbol.for('ICrashReporterService'),
    IAuthenticationService: Symbol.for('IAuthenticationService'),

    IAvailabilityService: Symbol.for('IAvailabilityService'),
    // Repositories
    IBusinessesRepository: Symbol.for('IBusinessesRepository'),
    IEmployeesRepository: Symbol.for('IEmployeesRepository'),

    // Use cases
    ICreateBusinessUseCase: Symbol.for('ICreateBusinessUseCase'),
    IListBusinessesUseCase: Symbol.for('IListBusinessesUseCase'),
    IUpdateBusinessUseCase: Symbol.for('IUpdateBusinessUseCase'),
    IListEmployeesUseCase: Symbol.for('IListEmployeesUseCase'),
    IAddEmployeeUseCase: Symbol.for('IAddEmployeeUseCase'),
    IRetireEmployeeUseCase: Symbol.for('IRetireEmployeeUseCase'),
    IGetEmployeeOverridesUseCase: Symbol.for('IGetEmployeeOverridesUseCase'),
    IPutEmployeeOverrideUseCase: Symbol.for('IPutEmployeeOverrideUseCase'),
    IDeleteEmployeeOverrideUseCase: Symbol.for('IDeleteEmployeeOverrideUseCase'),

    IListAvailabilitiesUseCase: Symbol.for('IListAvailabilitiesUseCase'),
    ICreateAvailabilityUseCase: Symbol.for('ICreateAvailabilityUseCase'),
    IUpdateAvailabilityUseCase: Symbol.for('IUpdateAvailabilityUseCase'),
    ISetDefaultAvailabilityUseCase: Symbol.for('ISetDefaultAvailabilityUseCase'),
    IDeleteAvailabilityUseCase: Symbol.for('IDeleteAvailabilityUseCase'),

    // Controllers
    IGetCurrentUserController: Symbol.for('IGetCurrentUserController'),
    ICreateBusinessController: Symbol.for('ICreateBusinessController'),
    IGetMyBusinessController: Symbol.for('IGetMyBusinessController'),
    IUpdateBusinessController: Symbol.for('IUpdateBusinessController'),
    IListMyEmployeesController: Symbol.for('IListMyEmployeesController'),
    IAddEmployeeController: Symbol.for('IAddEmployeeController'),
    IRetireEmployeeController: Symbol.for('IRetireEmployeeController'),
    IGetEmployeeOverridesController: Symbol.for('IGetEmployeeOverridesController'),
    IPutEmployeeOverrideController: Symbol.for('IPutEmployeeOverrideController'),
    IDeleteEmployeeOverrideController: Symbol.for('IDeleteEmployeeOverrideController'),
    IListAvailabilitiesController: Symbol.for('IListAvailabilitiesController'),
    ICreateAvailabilityController: Symbol.for('ICreateAvailabilityController'),
    IUpdateAvailabilityController: Symbol.for('IUpdateAvailabilityController'),
    ISetDefaultAvailabilityController: Symbol.for('ISetDefaultAvailabilityController'),
    IDeleteAvailabilityController: Symbol.for('IDeleteAvailabilityController'),
};

export interface DI_RETURN_TYPES {
    // Services
    IInstrumentationService: IInstrumentationService;
    ICrashReporterService: ICrashReporterService;
    IAuthenticationService: IAuthenticationService;

    // Repositories
    IBusinessesRepository: IBusinessesRepository;
    IEmployeesRepository: IEmployeesRepository;

    // Use cases
    ICreateBusinessUseCase: ICreateBusinessUseCase;
    IListBusinessesUseCase: IListBusinessesUseCase;
    IUpdateBusinessUseCase: IUpdateBusinessUseCase;
    IListEmployeesUseCase: IListEmployeesUseCase;
    IAddEmployeeUseCase: IAddEmployeeUseCase;
    IRetireEmployeeUseCase: IRetireEmployeeUseCase;
    IGetEmployeeOverridesUseCase: IGetEmployeeOverridesUseCase;
    IPutEmployeeOverrideUseCase: IPutEmployeeOverrideUseCase;
    IDeleteEmployeeOverrideUseCase: IDeleteEmployeeOverrideUseCase;

    // Controllers
    IGetCurrentUserController: IGetCurrentUserController;
    ICreateBusinessController: ICreateBusinessController;
    IGetMyBusinessController: IGetMyBusinessController;
    IUpdateBusinessController: IUpdateBusinessController;
    IListMyEmployeesController: IListMyEmployeesController;
    IAddEmployeeController: IAddEmployeeController;
    IRetireEmployeeController: IRetireEmployeeController;
    IGetEmployeeOverridesController: IGetEmployeeOverridesController;
    IPutEmployeeOverrideController: IPutEmployeeOverrideController;
    IDeleteEmployeeOverrideController: IDeleteEmployeeOverrideController;
    
    IListAvailabilitiesController: IListAvailabilitiesController;
    ICreateAvailabilityController: ICreateAvailabilityController;
    IUpdateAvailabilityController: IUpdateAvailabilityController;
    ISetDefaultAvailabilityController: ISetDefaultAvailabilityController;
    IDeleteAvailabilityController: IDeleteAvailabilityController;
    IListAvailabilitiesUseCase: IListAvailabilitiesUseCase;
    ICreateAvailabilityUseCase: ICreateAvailabilityUseCase;
    IUpdateAvailabilityUseCase: IUpdateAvailabilityUseCase;
    ISetDefaultAvailabilityUseCase: ISetDefaultAvailabilityUseCase;
    IDeleteAvailabilityUseCase: IDeleteAvailabilityUseCase;
    IAvailabilityService: IAvailabilityService;
}
