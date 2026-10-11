import { payDepositByLinkUseCase } from '@/src/application/use-cases/bookings/pay-deposit-by-link.use-case';
import { BookingStateError } from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';
import { clientBookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('payDepositByLinkUseCase', () => {
    it('asks the repository to pay the Seña of the Turno of the link', async () => {
        const paid = { id: 7 };
        const payDepositByLink = jest.fn().mockResolvedValue(paid);
        const result = await payDepositByLinkUseCase(instrumentation, clientBookingsWith({ payDepositByLink }))({ link: 's3cr3t-l1nk' });
        expect(payDepositByLink).toHaveBeenCalledWith('s3cr3t-l1nk');
        expect(result).toBe(paid);
    });

    it('lets NotFoundError through', async () => {
        const payDepositByLink = jest.fn().mockRejectedValue(new NotFoundError('Turno not found'));
        await expect(
            payDepositByLinkUseCase(instrumentation, clientBookingsWith({ payDepositByLink }))({ link: 'unknown' }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lets BookingStateError through', async () => {
        const payDepositByLink = jest.fn().mockRejectedValue(new BookingStateError('Turno 7 already has its Seña paid'));
        await expect(
            payDepositByLinkUseCase(instrumentation, clientBookingsWith({ payDepositByLink }))({ link: 's3cr3t-l1nk' }),
        ).rejects.toBeInstanceOf(BookingStateError);
    });
});
