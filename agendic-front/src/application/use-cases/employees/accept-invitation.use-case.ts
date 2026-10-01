import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IAcceptInvitationUseCase = ReturnType<typeof acceptInvitationUseCase>;
/**
 * Acepta una Invitación: el Usuario pasa a ser Empleado del Negocio.
 *
 * El back valida que la Invitación sea del Usuario (404); acá no se revalida.
 *
 * @throws {InvitationNotAcceptableError} la Invitación venció o el Usuario ya es Empleado
 */
export const acceptInvitationUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (invitationId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'acceptInvitation Use Case', op: 'function' }, () =>
            employeesRepository.acceptInvitation(invitationId),
        );
