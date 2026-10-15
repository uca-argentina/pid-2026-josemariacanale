import { listSeriesSlotsUseCase } from '@/src/application/use-cases/bookings/list-series-slots.use-case';
import { SlotUnavailableError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { bookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('listSeriesSlotsUseCase', () => {
    it('returns the dates of the Serie with the Empleado who attends it', async () => {
        const seriesSlots = {
            employeeId: 7,
            dates: [
                { date: '2026-09-28', startsAt: '2026-09-28T12:00:00.000Z', available: true },
                { date: '2026-10-05', startsAt: '2026-10-05T12:00:00.000Z', available: false },
            ],
        };
        const listSeriesSlots = jest.fn().mockResolvedValue(seriesSlots);
        const query = { serviceId: 100, startsAt: '2026-09-28T12:00:00.000Z', count: 2 };

        await expect(listSeriesSlotsUseCase(instrumentation, bookingsWith({ listSeriesSlots }))(query)).resolves.toEqual(seriesSlots);
        expect(listSeriesSlots).toHaveBeenCalledWith(query);
    });

    it('lets a Servicio that does not exist through as NotFoundError', async () => {
        const listSeriesSlots = jest.fn().mockRejectedValue(new NotFoundError('Service not found or retired'));
        await expect(
            listSeriesSlotsUseCase(instrumentation, bookingsWith({ listSeriesSlots }))({ serviceId: 9, startsAt: '2026-09-28T12:00:00.000Z', count: 2 }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lets a first horario that is no longer reservable through as SlotUnavailableError', async () => {
        const listSeriesSlots = jest.fn().mockRejectedValue(new SlotUnavailableError('Slot 2026-09-28T12:00:00.000Z is not available for Service 100'));
        await expect(
            listSeriesSlotsUseCase(instrumentation, bookingsWith({ listSeriesSlots }))({ serviceId: 100, startsAt: '2026-09-28T12:00:00.000Z', count: 2 }),
        ).rejects.toBeInstanceOf(SlotUnavailableError);
    });
});
