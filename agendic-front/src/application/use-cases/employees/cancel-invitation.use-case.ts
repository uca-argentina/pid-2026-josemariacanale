import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type ICancelInvitationUseCase = ReturnType<typeof cancelInvitationUseCase>;
/**
 * Cancela una Invitación pendiente del Negocio.
 *
 * El back valida que solo el Dueño pueda y que la Invitación sea del Negocio; acá no se revalida.
 *
 * @throws {InvitationNotPendingError} la Invitación ya se aceptó o rechazó
 */
export const cancelInvitationUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (invitationId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'cancelInvitation Use Case', op: 'function' }, () =>
            employeesRepository.cancelInvitation(invitationId),
        );
