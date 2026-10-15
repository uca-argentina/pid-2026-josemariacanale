import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { SeriesSlots, SeriesSlotsQuery } from '@/src/entities/models/slot';

export type IListSeriesSlotsUseCase = ReturnType<typeof listSeriesSlotsUseCase>;
/**
 * Las fechas de una Serie desde su primer horario (ADR 0032), cada una marcada si choca. El back las calcula con los
 * mismos Horarios reservables que un Turno suelto, fijando a quien atiende toda la Serie.
 *
 * @throws {NotFoundError} el Servicio no existe, está dado de baja o el Empleado no lo atiende
 * @throws {SlotUnavailableError} el primer horario ya no es un Horario reservable
 */
export const listSeriesSlotsUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (input: SeriesSlotsQuery): Promise<SeriesSlots> =>
        instrumentationService.startSpan({ name: 'listSeriesSlots Use Case', op: 'function' }, () =>
            bookingsRepository.listSeriesSlots(input),
        );
