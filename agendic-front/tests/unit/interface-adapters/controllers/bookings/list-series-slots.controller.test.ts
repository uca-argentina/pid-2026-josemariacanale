import { InputParseError } from '@/src/entities/errors/common';
import { listSeriesSlotsController } from '@/src/interface-adapters/controllers/bookings/list-series-slots.controller';
import { instrumentation } from '@/tests/unit/stubs';

const query = { serviceId: 100, startsAt: '2026-09-28T12:00:00.000Z', count: 3 };
const seriesSlots = {
    employeeId: 1,
    dates: [
        { date: '2026-09-28', startsAt: '2026-09-28T12:00:00.000Z', available: true },
        { date: '2026-10-05', startsAt: '2026-10-05T12:00:00.000Z', available: false },
    ],
};

describe('listSeriesSlotsController', () => {
    it('presents the dates of the Serie, marking the ones that clash', async () => {
        const useCase = jest.fn().mockResolvedValue(seriesSlots);

        await expect(listSeriesSlotsController(instrumentation, useCase)(query)).resolves.toEqual(seriesSlots);
        expect(useCase).toHaveBeenCalledWith(query);
    });

    it('asks for the dates with the Empleado elegido', async () => {
        const useCase = jest.fn().mockResolvedValue(seriesSlots);
        await listSeriesSlotsController(instrumentation, useCase)({ ...query, employeeId: 5 });
        expect(useCase).toHaveBeenCalledWith({ ...query, employeeId: 5 });
    });

    it.each([
        ['no serviceId', { ...query, serviceId: undefined }],
        ['a startsAt that is not ISO', { ...query, startsAt: '28/09/2026' }],
        ['a count under 2', { ...query, count: 1 }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(listSeriesSlotsController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
