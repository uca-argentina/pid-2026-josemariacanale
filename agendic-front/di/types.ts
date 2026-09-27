import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IPublicBusinessRepository } from '@/src/application/repositories/public-business.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IGetPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import type { IGetMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import type { ICreateBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import type { IUpdateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import type { IUpdateBusinessController } from '@/src/interface-adapters/controllers/businesses/update-business.controller';
import type { ICreateBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import type { IGetPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import type { IGetCurrentUserController } from '@/src/interface-adapters/controllers/auth/get-current-user.controller';
import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { IAddEmployeeUseCase } from '@/src/application/use-cases/employees/add-employee.use-case';
import type { IRetireEmployeeUseCase } from '@/src/application/use-cases/employees/retire-employee.use-case';
import type { ICreateBookingUseCase } from '@/src/application/use-cases/bookings/create-booking.use-case';
import type { IGetServiceSlotsUseCase } from '@/src/application/use-cases/bookings/get-service-slots.use-case';
import type { IListMyEmployeesController } from '@/src/interface-adapters/controllers/employees/list-my-employees.controller';
import type { IAddEmployeeController } from '@/src/interface-adapters/controllers/employees/add-employee.controller';
import type { IRetireEmployeeController } from '@/src/interface-adapters/controllers/employees/retire-employee.controller';
import type { ICreateBookingController } from '@/src/interface-adapters/controllers/bookings/create-booking.controller';
import type { IGetServiceSlotsController } from '@/src/interface-adapters/controllers/bookings/get-service-slots.controller';

export const DI_SYMBOLS = {
    // Services
    IInstrumentationService: Symbol.for('IInstrumentationService'),
    ICrashReporterService: Symbol.for('ICrashReporterService'),
    IAuthenticationService: Symbol.for('IAuthenticationService'),

    // Repositories
    IBusinessesRepository: Symbol.for('IBusinessesRepository'),
    IPublicBusinessRepository: Symbol.for('IPublicBusinessRepository'),
    IEmployeesRepository: Symbol.for('IEmployeesRepository'),
    IBookingsRepository: Symbol.for('IBookingsRepository'),

    // Use cases
    ICreateBusinessUseCase: Symbol.for('ICreateBusinessUseCase'),
    IListBusinessesUseCase: Symbol.for('IListBusinessesUseCase'),
    IUpdateBusinessUseCase: Symbol.for('IUpdateBusinessUseCase'),
    IGetPublicBusinessUseCase: Symbol.for('IGetPublicBusinessUseCase'),
    IListEmployeesUseCase: Symbol.for('IListEmployeesUseCase'),
    IAddEmployeeUseCase: Symbol.for('IAddEmployeeUseCase'),
    IRetireEmployeeUseCase: Symbol.for('IRetireEmployeeUseCase'),
    ICreateBookingUseCase: Symbol.for('ICreateBookingUseCase'),
    IGetServiceSlotsUseCase: Symbol.for('IGetServiceSlotsUseCase'),

    // Controllers
    IGetCurrentUserController: Symbol.for('IGetCurrentUserController'),
    ICreateBusinessController: Symbol.for('ICreateBusinessController'),
    IGetMyBusinessController: Symbol.for('IGetMyBusinessController'),
    IUpdateBusinessController: Symbol.for('IUpdateBusinessController'),
    IGetPublicBusinessController: Symbol.for('IGetPublicBusinessController'),
    IListMyEmployeesController: Symbol.for('IListMyEmployeesController'),
    IAddEmployeeController: Symbol.for('IAddEmployeeController'),
    IRetireEmployeeController: Symbol.for('IRetireEmployeeController'),
    ICreateBookingController: Symbol.for('ICreateBookingController'),
    IGetServiceSlotsController: Symbol.for('IGetServiceSlotsController'),
};

export interface DI_RETURN_TYPES {
    // Services
    IInstrumentationService: IInstrumentationService;
    ICrashReporterService: ICrashReporterService;
    IAuthenticationService: IAuthenticationService;

    // Repositories
    IBusinessesRepository: IBusinessesRepository;
    IPublicBusinessRepository: IPublicBusinessRepository;
    IEmployeesRepository: IEmployeesRepository;
    IBookingsRepository: IBookingsRepository;

    // Use cases
    ICreateBusinessUseCase: ICreateBusinessUseCase;
    IListBusinessesUseCase: IListBusinessesUseCase;
    IUpdateBusinessUseCase: IUpdateBusinessUseCase;
    IGetPublicBusinessUseCase: IGetPublicBusinessUseCase;
    IListEmployeesUseCase: IListEmployeesUseCase;
    IAddEmployeeUseCase: IAddEmployeeUseCase;
    IRetireEmployeeUseCase: IRetireEmployeeUseCase;
    ICreateBookingUseCase: ICreateBookingUseCase;
    IGetServiceSlotsUseCase: IGetServiceSlotsUseCase;

    // Controllers
    IGetCurrentUserController: IGetCurrentUserController;
    ICreateBusinessController: ICreateBusinessController;
    IGetMyBusinessController: IGetMyBusinessController;
    IUpdateBusinessController: IUpdateBusinessController;
    IGetPublicBusinessController: IGetPublicBusinessController;
    IListMyEmployeesController: IListMyEmployeesController;
    IAddEmployeeController: IAddEmployeeController;
    IRetireEmployeeController: IRetireEmployeeController;
    ICreateBookingController: ICreateBookingController;
    IGetServiceSlotsController: IGetServiceSlotsController;
}
