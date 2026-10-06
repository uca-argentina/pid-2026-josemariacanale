import { InputParseError } from '@/src/entities/errors/common';
import { listSlotsController } from '@/src/interface-adapters/controllers/bookings/list-slots.controller';
import { instrumentation } from '@/tests/unit/stubs';

const query = { serviceId: 100, from: '2026-09-28', to: '2026-10-11' };

describe('listSlotsController', () => {
    it('presents each Horario reservable with its time in the zona horaria of the Sucursal', async () => {
        const useCase = jest.fn().mockResolvedValue({
            timeZone: 'America/Argentina/Buenos_Aires',
            days: [
                { date: '2026-09-28', slots: ['2026-09-28T12:00:00.000Z', '2026-09-28T12:15:00.000Z'] },
                { date: '2026-09-29', slots: [], reason: 'FULLY_BOOKED' },
                { date: '2026-09-30', slots: [], reason: 'NOT_WORKING' },
            ],
        });

        await expect(listSlotsController(instrumentation, useCase)(query)).resolves.toEqual({
            days: [
                {
                    date: '2026-09-28',
                    slots: [
                        { startsAt: '2026-09-28T12:00:00.000Z', time: '09:00' },
                        { startsAt: '2026-09-28T12:15:00.000Z', time: '09:15' },
                    ],
                },
                { date: '2026-09-29', slots: [], reason: 'FULLY_BOOKED' },
                { date: '2026-09-30', slots: [], reason: 'NOT_WORKING' },
            ],
        });
        expect(useCase).toHaveBeenCalledWith(query);
    });

    it('formats midnight as 00:00, never 24:00', async () => {
        const useCase = jest.fn().mockResolvedValue({
            timeZone: 'UTC',
            days: [{ date: '2026-09-28', slots: ['2026-09-28T00:00:00.000Z'] }],
        });

        const { days } = await listSlotsController(instrumentation, useCase)(query);
        expect(days[0].slots[0].time).toBe('00:00');
    });

    it.each([
        ['a serviceId that is not an integer', { ...query, serviceId: 1.5 }],
        ['a date that is not YYYY-MM-DD', { ...query, from: '28/09/2026' }],
        ['a to before from', { ...query, from: '2026-10-11', to: '2026-09-28' }],
        ['a range over 31 days', { ...query, from: '2026-09-01', to: '2026-10-02' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, input) => {
        const useCase = jest.fn();
        await expect(listSlotsController(instrumentation, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('accepts a range of exactly 31 days', async () => {
        const useCase = jest.fn().mockResolvedValue({ timeZone: 'UTC', days: [] });
        await expect(
            listSlotsController(instrumentation, useCase)({ ...query, from: '2026-09-01', to: '2026-10-01' }),
        ).resolves.toEqual({ days: [] });
    });
});
