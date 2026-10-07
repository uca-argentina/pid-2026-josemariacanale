import { requestVerificationCodeUseCase } from '@/src/application/use-cases/bookings/request-verification-code.use-case';
import { TooManyVerificationCodeRequestsError } from '@/src/entities/errors/booking';
import { bookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('requestVerificationCodeUseCase', () => {
    it('pide un Código de verificación para el email', async () => {
        const requestVerificationCode = jest.fn().mockResolvedValue(undefined);

        await requestVerificationCodeUseCase(instrumentation, bookingsWith({ requestVerificationCode }))('juana@example.com');

        expect(requestVerificationCode).toHaveBeenCalledWith('juana@example.com');
    });

    it('lets too many requests through as TooManyVerificationCodeRequestsError', async () => {
        const error = new TooManyVerificationCodeRequestsError('Too many verification codes requested for juana@example.com');
        const requestVerificationCode = jest.fn().mockRejectedValue(error);

        await expect(
            requestVerificationCodeUseCase(instrumentation, bookingsWith({ requestVerificationCode }))('juana@example.com'),
        ).rejects.toBe(error);
    });
});
