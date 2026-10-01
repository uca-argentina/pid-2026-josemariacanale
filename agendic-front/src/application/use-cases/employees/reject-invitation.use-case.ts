import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IRejectInvitationUseCase = ReturnType<typeof rejectInvitationUseCase>;
/**
 * Rechaza una Invitación del Usuario autenticado.
 *
 * El back valida que la Invitación sea del Usuario (404); acá no se revalida.
 */
export const rejectInvitationUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (invitationId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'rejectInvitation Use Case', op: 'function' }, () =>
            employeesRepository.rejectInvitation(invitationId),
        );
