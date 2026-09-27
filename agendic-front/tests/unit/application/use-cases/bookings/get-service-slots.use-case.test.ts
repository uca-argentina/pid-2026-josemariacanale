import { getServiceSlotsUseCase } from '@/src/application/use-cases/bookings/get-service-slots.use-case';
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

describe('getServiceSlotsUseCase', () => {
    it('returns service slots from repository', async () => {
        const repo = {
            createBooking: jest.fn(),
            getServiceSlots: jest.fn().mockResolvedValue(slotsData),
        };

        const result = await getServiceSlotsUseCase(instrumentation, repo)({
            serviceId: 2,
            employeeId: 3,
            from: '2026-10-01',
            to: '2026-10-07',
        });

        expect(repo.getServiceSlots).toHaveBeenCalledWith(2, 3, '2026-10-01', '2026-10-07');
        expect(result).toEqual(slotsData);
    });
});
