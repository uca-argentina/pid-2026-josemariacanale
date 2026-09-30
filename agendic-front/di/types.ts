import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IGetPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import type { IGetPublicBranchUseCase } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import type { IGetPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import type { IGetPublicBranchController } from '@/src/interface-adapters/controllers/businesses/get-public-branch.controller';
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
import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IListSlotsUseCase } from '@/src/application/use-cases/bookings/list-slots.use-case';
import type { IBookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import type { IListSlotsController } from '@/src/interface-adapters/controllers/bookings/list-slots.controller';
import type { IBookSlotController } from '@/src/interface-adapters/controllers/bookings/book-slot.controller';
import type { IRetireEmployeeController } from '@/src/interface-adapters/controllers/employees/retire-employee.controller';
import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IListMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import type { IListMyBookingsController } from '@/src/interface-adapters/controllers/bookings/list-my-bookings.controller';

export const DI_SYMBOLS = {
    // Services
    IInstrumentationService: Symbol.for('IInstrumentationService'),
    ICrashReporterService: Symbol.for('ICrashReporterService'),
    IAuthenticationService: Symbol.for('IAuthenticationService'),

    // Repositories
    IBusinessesRepository: Symbol.for('IBusinessesRepository'),
    IPublicBusinessesRepository: Symbol.for('IPublicBusinessesRepository'),
    IEmployeesRepository: Symbol.for('IEmployeesRepository'),
    IBookingsRepository: Symbol.for('IBookingsRepository'),
    IEmployeeBookingsRepository: Symbol.for('IEmployeeBookingsRepository'),

    // Use cases
    ICreateBusinessUseCase: Symbol.for('ICreateBusinessUseCase'),
    IListBusinessesUseCase: Symbol.for('IListBusinessesUseCase'),
    IUpdateBusinessUseCase: Symbol.for('IUpdateBusinessUseCase'),
    IGetPublicBusinessUseCase: Symbol.for('IGetPublicBusinessUseCase'),
    IGetPublicBranchUseCase: Symbol.for('IGetPublicBranchUseCase'),
    IListEmployeesUseCase: Symbol.for('IListEmployeesUseCase'),
    IAddEmployeeUseCase: Symbol.for('IAddEmployeeUseCase'),
    IRetireEmployeeUseCase: Symbol.for('IRetireEmployeeUseCase'),
    IListSlotsUseCase: Symbol.for('IListSlotsUseCase'),
    IBookSlotUseCase: Symbol.for('IBookSlotUseCase'),
    IListMyBookingsUseCase: Symbol.for('IListMyBookingsUseCase'),

    // Controllers
    IGetCurrentUserController: Symbol.for('IGetCurrentUserController'),
    ICreateBusinessController: Symbol.for('ICreateBusinessController'),
    IGetMyBusinessController: Symbol.for('IGetMyBusinessController'),
    IUpdateBusinessController: Symbol.for('IUpdateBusinessController'),
    IGetPublicBusinessController: Symbol.for('IGetPublicBusinessController'),
    IGetPublicBranchController: Symbol.for('IGetPublicBranchController'),
    IListMyEmployeesController: Symbol.for('IListMyEmployeesController'),
    IAddEmployeeController: Symbol.for('IAddEmployeeController'),
    IRetireEmployeeController: Symbol.for('IRetireEmployeeController'),
    IListSlotsController: Symbol.for('IListSlotsController'),
    IBookSlotController: Symbol.for('IBookSlotController'),
    IListMyBookingsController: Symbol.for('IListMyBookingsController'),
};

export interface DI_RETURN_TYPES {
    // Services
    IInstrumentationService: IInstrumentationService;
    ICrashReporterService: ICrashReporterService;
    IAuthenticationService: IAuthenticationService;

    // Repositories
    IBusinessesRepository: IBusinessesRepository;
    IPublicBusinessesRepository: IPublicBusinessesRepository;
    IEmployeesRepository: IEmployeesRepository;
    IBookingsRepository: IBookingsRepository;
    IEmployeeBookingsRepository: IEmployeeBookingsRepository;

    // Use cases
    ICreateBusinessUseCase: ICreateBusinessUseCase;
    IListBusinessesUseCase: IListBusinessesUseCase;
    IUpdateBusinessUseCase: IUpdateBusinessUseCase;
    IGetPublicBusinessUseCase: IGetPublicBusinessUseCase;
    IGetPublicBranchUseCase: IGetPublicBranchUseCase;
    IListEmployeesUseCase: IListEmployeesUseCase;
    IAddEmployeeUseCase: IAddEmployeeUseCase;
    IRetireEmployeeUseCase: IRetireEmployeeUseCase;
    IListSlotsUseCase: IListSlotsUseCase;
    IBookSlotUseCase: IBookSlotUseCase;
    IListMyBookingsUseCase: IListMyBookingsUseCase;

    // Controllers
    IGetCurrentUserController: IGetCurrentUserController;
    ICreateBusinessController: ICreateBusinessController;
    IGetMyBusinessController: IGetMyBusinessController;
    IUpdateBusinessController: IUpdateBusinessController;
    IGetPublicBusinessController: IGetPublicBusinessController;
    IGetPublicBranchController: IGetPublicBranchController;
    IListMyEmployeesController: IListMyEmployeesController;
    IAddEmployeeController: IAddEmployeeController;
    IRetireEmployeeController: IRetireEmployeeController;
    IListSlotsController: IListSlotsController;
    IBookSlotController: IBookSlotController;
    IListMyBookingsController: IListMyBookingsController;
}
