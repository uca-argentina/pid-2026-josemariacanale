import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Invitation } from '@/src/entities/models/employee';

export type IResendInvitationUseCase = ReturnType<typeof resendInvitationUseCase>;
/**
 * Reenvía una Invitación pendiente del Negocio y renueva su vencimiento.
 *
 * El back valida que solo el Dueño pueda y que la Invitación sea del Negocio; acá no se revalida.
 *
 * @throws {InvitationNotPendingError} la Invitación ya se aceptó o rechazó
 */
export const resendInvitationUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (invitationId: number): Promise<Invitation> =>
        instrumentationService.startSpan({ name: 'resendInvitation Use Case', op: 'function' }, () =>
            employeesRepository.resendInvitation(invitationId),
        );
