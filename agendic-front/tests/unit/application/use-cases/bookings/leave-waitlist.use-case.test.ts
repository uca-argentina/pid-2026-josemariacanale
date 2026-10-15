import { leaveWaitlistUseCase } from '@/src/application/use-cases/bookings/leave-waitlist.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, waitlistWith } from '@/tests/unit/stubs';

describe('leaveWaitlistUseCase', () => {
    it('saca al Cliente de la Lista de espera', async () => {
        const leave = jest.fn().mockResolvedValue(undefined);

        await expect(leaveWaitlistUseCase(instrumentation, waitlistWith({ leave }))({ link: 'abc' })).resolves.toBeUndefined();
        expect(leave).toHaveBeenCalledWith('abc');
    });

    it('deja pasar el NotFoundError de un enlace que no existe', async () => {
        const error = new NotFoundError('Anotación not found');
        const leave = jest.fn().mockRejectedValue(error);

        await expect(leaveWaitlistUseCase(instrumentation, waitlistWith({ leave }))({ link: 'abc' })).rejects.toBe(error);
    });
});
