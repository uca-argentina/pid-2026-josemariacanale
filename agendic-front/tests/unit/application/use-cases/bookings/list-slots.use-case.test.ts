import { listSlotsUseCase } from '@/src/application/use-cases/bookings/list-slots.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { bookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('listSlotsUseCase', () => {
    it('returns the Horarios reservables of the Servicio with the Empleado in the range', async () => {
        const slots = {
            timeZone: 'America/Argentina/Buenos_Aires',
            days: [
                { date: '2026-09-28', slots: ['2026-09-28T12:00:00.000Z'] },
                { date: '2026-09-29', slots: [], reason: 'NOT_WORKING' as const },
            ],
        };
        const listSlots = jest.fn().mockResolvedValue(slots);
        const query = { serviceId: 100, from: '2026-09-28', to: '2026-09-29' };

        await expect(listSlotsUseCase(instrumentation, bookingsWith({ listSlots }))(query)).resolves.toEqual(slots);
        expect(listSlots).toHaveBeenCalledWith(query);
    });

    it('lets a Servicio or Empleado that does not exist through as NotFoundError', async () => {
        const listSlots = jest.fn().mockRejectedValue(new NotFoundError('Service not found'));
        await expect(
            listSlotsUseCase(instrumentation, bookingsWith({ listSlots }))({ serviceId: 9, from: '2026-09-28', to: '2026-09-29' }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
