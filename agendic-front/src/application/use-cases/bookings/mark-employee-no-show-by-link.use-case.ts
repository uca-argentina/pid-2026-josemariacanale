import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IMarkEmployeeNoShowByLinkUseCase = ReturnType<typeof markEmployeeNoShowByLinkUseCase>;

/**
 * Marca la Falta del Empleado en el Turno de un Enlace del Turno: el Cliente avisa que el Empleado no vino.
 *
 * Quien tiene el Enlace puede marcarla (ADR 0022): no hay otra autorización que validar.
 *
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no está aceptado, no empezó, venció el plazo, tiene Ausencia, ya tiene la Falta o no admite marcarla
 */
export const markEmployeeNoShowByLinkUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { link: string }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'markEmployeeNoShowByLink Use Case', op: 'function' }, () =>
            clientBookingsRepository.markEmployeeNoShowByLink(input.link),
        );
