import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { MyInvitation } from '@/src/entities/models/employee';

export type IListMyInvitationsUseCase = ReturnType<typeof listMyInvitationsUseCase>;
/** Lista las Invitaciones pendientes dirigidas al Usuario autenticado. */
export const listMyInvitationsUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (): Promise<MyInvitation[]> =>
        instrumentationService.startSpan({ name: 'listMyInvitations Use Case', op: 'function' }, () =>
            employeesRepository.listMyInvitations(),
        );
