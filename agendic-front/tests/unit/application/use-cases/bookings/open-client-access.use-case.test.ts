import { openClientAccessUseCase } from '@/src/application/use-cases/bookings/open-client-access.use-case';
import { InvalidVerificationCodeError } from '@/src/entities/errors/booking';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('openClientAccessUseCase', () => {
    it('asks the repository to open access for email and code', async () => {
        const access = { access: 'signed-token', expiresAt: '2026-10-10T12:15:00.000Z' };
        const openAccess = jest.fn().mockResolvedValue(access);
        const result = await openClientAccessUseCase(instrumentation, clientBookingsWith({ openAccess }))({
            email: 'juana@example.com',
            code: 'ABC123',
        });
        expect(openAccess).toHaveBeenCalledWith('juana@example.com', 'ABC123');
        expect(result).toEqual(access);
    });

    it('lets InvalidVerificationCodeError through', async () => {
        const openAccess = jest.fn().mockRejectedValue(new InvalidVerificationCodeError('no'));
        await expect(
            openClientAccessUseCase(instrumentation, clientBookingsWith({ openAccess }))({ email: 'juana@example.com', code: 'ABC123' }),
        ).rejects.toBeInstanceOf(InvalidVerificationCodeError);
    });
});
