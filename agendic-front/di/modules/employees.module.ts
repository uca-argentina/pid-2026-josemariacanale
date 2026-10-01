import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { addEmployeeUseCase } from '@/src/application/use-cases/employees/add-employee.use-case';
import { listEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import { listInvitationsUseCase } from '@/src/application/use-cases/employees/list-invitations.use-case';
import { retireEmployeeUseCase } from '@/src/application/use-cases/employees/retire-employee.use-case';
import { EmployeesRepository } from '@/src/infrastructure/repositories/employees.repository';
import { addEmployeeController } from '@/src/interface-adapters/controllers/employees/add-employee.controller';
import { listMyEmployeesController } from '@/src/interface-adapters/controllers/employees/list-my-employees.controller';
import { retireEmployeeController } from '@/src/interface-adapters/controllers/employees/retire-employee.controller';

export function createEmployeesModule() {
    const employeesModule = createModule();

    employeesModule.bind(DI_SYMBOLS.IEmployeesRepository).toClass(EmployeesRepository, [DI_SYMBOLS.IAuthenticationService]);

    employeesModule
        .bind(DI_SYMBOLS.IListEmployeesUseCase)
        .toHigherOrderFunction(listEmployeesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IAddEmployeeUseCase)
        .toHigherOrderFunction(addEmployeeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IListInvitationsUseCase)
        .toHigherOrderFunction(listInvitationsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IRetireEmployeeUseCase)
        .toHigherOrderFunction(retireEmployeeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IListMyEmployeesController)
        .toHigherOrderFunction(listMyEmployeesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListBusinessesUseCase,
            DI_SYMBOLS.IListEmployeesUseCase,
            DI_SYMBOLS.IListInvitationsUseCase,
        ]);

    employeesModule
        .bind(DI_SYMBOLS.IAddEmployeeController)
        .toHigherOrderFunction(addEmployeeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IAddEmployeeUseCase,
        ]);

    employeesModule
        .bind(DI_SYMBOLS.IRetireEmployeeController)
        .toHigherOrderFunction(retireEmployeeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRetireEmployeeUseCase,
        ]);

    return employeesModule;
}
