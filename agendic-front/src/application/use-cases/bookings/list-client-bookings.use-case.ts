import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ClientBooking } from '@/src/entities/models/client-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListClientBookingsUseCase = ReturnType<typeof listClientBookingsUseCase>;

/**
 * Lista los Turnos del email del acceso, en cualquier Negocio o Servicio personal.
 *
 * @throws {ClientAccessExpiredError} el acceso falta o venció
 */
export const listClientBookingsUseCase =
    (instrumentationService: IInstrumentationService, clientBookingsRepository: IClientBookingsRepository) =>
    (access: string): Promise<ClientBooking[]> =>
        instrumentationService.startSpan({ name: 'listClientBookings Use Case', op: 'function' }, () =>
            clientBookingsRepository.listBookings(access),
        );
