import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { addEmployeeUseCase } from '@/src/application/use-cases/employees/add-employee.use-case';
import { listEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import { listInvitationsUseCase } from '@/src/application/use-cases/employees/list-invitations.use-case';
import { retireEmployeeUseCase } from '@/src/application/use-cases/employees/retire-employee.use-case';
import { listMyInvitationsUseCase } from '@/src/application/use-cases/employees/list-my-invitations.use-case';
import { acceptInvitationUseCase } from '@/src/application/use-cases/employees/accept-invitation.use-case';
import { rejectInvitationUseCase } from '@/src/application/use-cases/employees/reject-invitation.use-case';
import { resendInvitationUseCase } from '@/src/application/use-cases/employees/resend-invitation.use-case';
import { cancelInvitationUseCase } from '@/src/application/use-cases/employees/cancel-invitation.use-case';
import { resendInvitationController } from '@/src/interface-adapters/controllers/employees/resend-invitation.controller';
import { cancelInvitationController } from '@/src/interface-adapters/controllers/employees/cancel-invitation.controller';
import { listMyInvitationsController } from '@/src/interface-adapters/controllers/employees/list-my-invitations.controller';
import { acceptInvitationController } from '@/src/interface-adapters/controllers/employees/accept-invitation.controller';
import { rejectInvitationController } from '@/src/interface-adapters/controllers/employees/reject-invitation.controller';
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

    employeesModule
        .bind(DI_SYMBOLS.IListMyInvitationsUseCase)
        .toHigherOrderFunction(listMyInvitationsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IAcceptInvitationUseCase)
        .toHigherOrderFunction(acceptInvitationUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IRejectInvitationUseCase)
        .toHigherOrderFunction(rejectInvitationUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IListMyInvitationsController)
        .toHigherOrderFunction(listMyInvitationsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListMyInvitationsUseCase,
        ]);

    employeesModule
        .bind(DI_SYMBOLS.IAcceptInvitationController)
        .toHigherOrderFunction(acceptInvitationController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IAcceptInvitationUseCase,
        ]);

    employeesModule
        .bind(DI_SYMBOLS.IRejectInvitationController)
        .toHigherOrderFunction(rejectInvitationController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRejectInvitationUseCase,
        ]);

    employeesModule
        .bind(DI_SYMBOLS.IResendInvitationUseCase)
        .toHigherOrderFunction(resendInvitationUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.IResendInvitationController)
        .toHigherOrderFunction(resendInvitationController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IResendInvitationUseCase,
        ]);

    employeesModule
        .bind(DI_SYMBOLS.ICancelInvitationUseCase)
        .toHigherOrderFunction(cancelInvitationUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeesRepository]);

    employeesModule
        .bind(DI_SYMBOLS.ICancelInvitationController)
        .toHigherOrderFunction(cancelInvitationController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICancelInvitationUseCase,
        ]);

    return employeesModule;
}
