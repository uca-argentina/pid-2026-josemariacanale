import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { leaveWaitlistController } from '@/src/interface-adapters/controllers/bookings/leave-waitlist.controller';
import { instrumentation } from '@/tests/unit/stubs';

describe('leaveWaitlistController', () => {
    it('saca de la Lista de espera con el enlace recortado', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await expect(leaveWaitlistController(instrumentation, useCase)({ link: ' abc ' })).resolves.toBeUndefined();
        expect(useCase).toHaveBeenCalledWith({ link: 'abc' });
    });

    it.each([
        ['a missing link', {}],
        ['a blank link', { link: '   ' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(leaveWaitlistController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets NotFoundError through', async () => {
        const error = new NotFoundError('Anotación not found');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(leaveWaitlistController(instrumentation, useCase)({ link: 'abc' })).rejects.toBe(error);
    });
});
