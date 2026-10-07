import { TooManyVerificationCodeRequestsError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { requestVerificationCodeController } from '@/src/interface-adapters/controllers/bookings/request-verification-code.controller';
import { instrumentation } from '@/tests/unit/stubs';

describe('requestVerificationCodeController', () => {
    it('pide el código con el email recortado', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await requestVerificationCodeController(instrumentation, useCase)({ email: ' juana@example.com ' });

        expect(useCase).toHaveBeenCalledWith('juana@example.com');
    });

    it.each([
        ['a missing email', {}],
        ['an invalid email', { email: 'juana' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(requestVerificationCodeController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    // The framework layer tells it apart by class so it does not report it: it is expected.
    it('lets too many requests through as TooManyVerificationCodeRequestsError', async () => {
        const error = new TooManyVerificationCodeRequestsError('Too many verification codes requested for juana@example.com');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(requestVerificationCodeController(instrumentation, useCase)({ email: 'juana@example.com' })).rejects.toBe(error);
    });
});
