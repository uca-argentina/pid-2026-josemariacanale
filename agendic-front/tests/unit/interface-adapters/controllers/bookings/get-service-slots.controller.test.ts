import { getServiceSlotsController } from '@/src/interface-adapters/controllers/bookings/get-service-slots.controller';
import { InputParseError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const slotsData = {
    timeZone: 'America/Argentina/Buenos_Aires',
    days: [
        {
            date: '2026-10-01',
            slots: ['2026-10-01T13:00:00.000Z', '2026-10-01T13:30:00.000Z'],
        },
    ],
};

const validQuery = {
    serviceId: 2,
    employeeId: 3,
    from: '2026-10-01',
    to: '2026-10-07',
};

describe('getServiceSlotsController', () => {
    it('returns presented slots on happy path', async () => {
        const useCase = jest.fn().mockResolvedValue(slotsData);

        const result = await getServiceSlotsController(instrumentation, useCase)(validQuery);

        expect(useCase).toHaveBeenCalledWith(validQuery);
        expect(result).toEqual(slotsData);
    });

    it('throws InputParseError on malformed dates', async () => {
        const useCase = jest.fn();

        await expect(
            getServiceSlotsController(
                instrumentation,
                useCase,
            )({
                ...validQuery,
                from: '01-10-2026',
            }),
        ).rejects.toBeInstanceOf(InputParseError);

        expect(useCase).not.toHaveBeenCalled();
    });
});
