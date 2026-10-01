import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Invitation } from '@/src/entities/models/employee';

export type IListInvitationsUseCase = ReturnType<typeof listInvitationsUseCase>;
/**
 * Lista las Invitaciones pendientes del Negocio.
 *
 * El back valida que solo el Dueño pueda verlas (403); acá no se revalida.
 */
export const listInvitationsUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (businessId: number): Promise<Invitation[]> =>
        instrumentationService.startSpan({ name: 'listInvitations Use Case', op: 'function' }, () =>
            employeesRepository.listInvitations(businessId),
        );
