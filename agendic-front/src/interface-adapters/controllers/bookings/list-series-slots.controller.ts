import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListSeriesSlotsUseCase } from '@/src/application/use-cases/bookings/list-series-slots.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { SeriesSlots } from '@/src/entities/models/slot';

function presenter(seriesSlots: SeriesSlots, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listSeriesSlots Presenter', op: 'serialize' }, () => ({
        employeeId: seriesSlots.employeeId,
        dates: seriesSlots.dates.map((d) => ({ date: d.date, startsAt: d.startsAt, available: d.available })),
    }));
}

const inputSchema = z.object({
    serviceId: z.number().int().positive(),
    startsAt: z.iso.datetime(),
    count: z.number().int().min(2),
    employeeId: z.number().int().positive().optional(),
});

export type IListSeriesSlotsController = ReturnType<typeof listSeriesSlotsController>;

/**
 * Las fechas de una Serie para el paso Fechas de la reserva, con las que chocan marcadas. Público: Reservar no pide
 * Sesión (ADR 0005).
 *
 * @throws {InputParseError} falta el Servicio, `startsAt` no es ISO o `count` es menor que 2
 * @throws {NotFoundError} el Servicio no existe, está dado de baja o el Empleado no lo atiende
 * @throws {SlotUnavailableError} el primer horario ya no es un Horario reservable
 */
export const listSeriesSlotsController =
    (instrumentationService: IInstrumentationService, listSeriesSlotsUseCase: IListSeriesSlotsUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listSeriesSlots Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await listSeriesSlotsUseCase(data), instrumentationService);
        });
