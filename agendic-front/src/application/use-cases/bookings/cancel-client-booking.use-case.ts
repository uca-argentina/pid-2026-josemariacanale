import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICancelClientBookingUseCase = ReturnType<typeof cancelClientBookingUseCase>;

/**
 * Cancela un Turno pendiente o aceptado del Cliente; su horario queda libre.
 *
 * Que el Turno sea del email del acceso lo valida el back.
 *
 * @throws {ClientAccessExpiredError} el acceso falta o venció
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado, o ya empezó
 */
export const cancelClientBookingUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (input: { access: string; bookingId: number }): Promise<ClientBooking> =>
        instrumentationService.startSpan({ name: 'cancelClientBooking Use Case', op: 'function' }, () =>
            clientBookingsRepository.cancel(input.access, input.bookingId),
        );
