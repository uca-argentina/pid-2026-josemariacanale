import { joinWaitlistUseCase } from '@/src/application/use-cases/bookings/join-waitlist.use-case';
import { WaitlistDayNotFullError } from '@/src/entities/errors/waitlist';
import { instrumentation, waitlistWith } from '@/tests/unit/stubs';

const input = { serviceId: 100, date: '2026-10-20', clientName: 'Juana Pérez', clientEmail: 'juana@example.com', code: 'ABC234' };

describe('joinWaitlistUseCase', () => {
    it('anota al Cliente y devuelve la Anotación', async () => {
        const join = jest.fn().mockResolvedValue({ serviceId: 100, date: '2026-10-20' });

        await expect(joinWaitlistUseCase(instrumentation, waitlistWith({ join }))(input)).resolves.toEqual({
            serviceId: 100,
            date: '2026-10-20',
        });
        expect(join).toHaveBeenCalledWith(input);
    });

    it('lets a day that is not full through as WaitlistDayNotFullError', async () => {
        const error = new WaitlistDayNotFullError('Date 2026-10-20 is not fully booked for Service 100');
        const join = jest.fn().mockRejectedValue(error);

        await expect(joinWaitlistUseCase(instrumentation, waitlistWith({ join }))(input)).rejects.toBe(error);
    });
});
