import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Slots, SlotsQuery } from '@/src/entities/models/slot';

export type IListSlotsUseCase = ReturnType<typeof listSlotsUseCase>;
// The Horarios reservables of a Servicio with one Empleado, day by day. The back already discounts
// Anulaciones and Turnos taken, and says why a day has none.
export const listSlotsUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (input: SlotsQuery): Promise<Slots> =>
        instrumentationService.startSpan({ name: 'listSlots Use Case', op: 'function' }, () =>
            bookingsRepository.listSlots(input),
        );
