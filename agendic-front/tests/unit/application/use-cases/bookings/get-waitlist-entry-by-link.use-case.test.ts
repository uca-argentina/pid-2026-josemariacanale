import { getWaitlistEntryByLinkUseCase } from '@/src/application/use-cases/bookings/get-waitlist-entry-by-link.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, waitlistWith, waitlistEntryView } from '@/tests/unit/stubs';

const view = waitlistEntryView;

describe('getWaitlistEntryByLinkUseCase', () => {
    it('devuelve la Anotación del enlace', async () => {
        const getByLink = jest.fn().mockResolvedValue(view);

        await expect(getWaitlistEntryByLinkUseCase(instrumentation, waitlistWith({ getByLink }))({ link: 'abc' })).resolves.toEqual(view);
        expect(getByLink).toHaveBeenCalledWith('abc');
    });

    it('deja pasar el NotFoundError de un enlace que no existe', async () => {
        const error = new NotFoundError('Anotación not found');
        const getByLink = jest.fn().mockRejectedValue(error);

        await expect(getWaitlistEntryByLinkUseCase(instrumentation, waitlistWith({ getByLink }))({ link: 'abc' })).rejects.toBe(error);
    });
});
