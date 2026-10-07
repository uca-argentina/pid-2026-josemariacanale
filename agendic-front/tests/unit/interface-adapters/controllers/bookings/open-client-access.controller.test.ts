import { InvalidVerificationCodeError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { openClientAccessController } from '@/src/interface-adapters/controllers/bookings/open-client-access.controller';
import { instrumentation } from '@/tests/unit/stubs';

describe('openClientAccessController', () => {
    it('abre el acceso con el email recortado y devuelve access y expiresAt', async () => {
        const useCase = jest.fn().mockResolvedValue({ access: 'signed-token', expiresAt: '2026-10-10T12:15:00.000Z' });

        const result = await openClientAccessController(instrumentation, useCase)({ email: ' juana@example.com ', code: 'ABC123' });

        expect(useCase).toHaveBeenCalledWith({ email: 'juana@example.com', code: 'ABC123' });
        expect(result).toEqual({ access: 'signed-token', expiresAt: '2026-10-10T12:15:00.000Z' });
    });

    it.each([
        ['a missing email', { code: 'ABC123' }],
        ['an invalid email', { email: 'juana', code: 'ABC123' }],
        ['a missing code', { email: 'juana@example.com' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(openClientAccessController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets InvalidVerificationCodeError through', async () => {
        const error = new InvalidVerificationCodeError('Invalid or expired verification code for juana@example.com');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(openClientAccessController(instrumentation, useCase)({ email: 'juana@example.com', code: 'ABC123' })).rejects.toBe(
            error,
        );
    });
});
