import { getWaitlistEntryByLinkUseCase } from '@/src/application/use-cases/bookings/get-waitlist-entry-by-link.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, waitlistWith } from '@/tests/unit/stubs';

const view = {
    date: '2026-10-20',
    timeZone: 'America/Argentina/Buenos_Aires',
    left: false,
    service: { name: 'Masaje', slug: 'masaje' },
    business: { name: 'Spa Sol', slug: 'spa-sol' },
    branch: { name: 'Centro', slug: 'centro' },
    user: null,
};

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
