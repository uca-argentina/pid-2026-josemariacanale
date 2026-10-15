import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { getWaitlistEntryByLinkController } from '@/src/interface-adapters/controllers/bookings/get-waitlist-entry-by-link.controller';
import { instrumentation, waitlistEntryView } from '@/tests/unit/stubs';

const view = waitlistEntryView;

describe('getWaitlistEntryByLinkController', () => {
    it('presenta la Anotación del enlace recortado', async () => {
        const useCase = jest.fn().mockResolvedValue({ ...view, extra: 'no sale' });

        await expect(getWaitlistEntryByLinkController(instrumentation, useCase)({ link: ' abc ' })).resolves.toEqual(view);
        expect(useCase).toHaveBeenCalledWith({ link: 'abc' });
    });

    it.each([
        ['a missing link', {}],
        ['a blank link', { link: '   ' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(getWaitlistEntryByLinkController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets NotFoundError through', async () => {
        const error = new NotFoundError('Anotación not found');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(getWaitlistEntryByLinkController(instrumentation, useCase)({ link: 'abc' })).rejects.toBe(error);
    });
});
