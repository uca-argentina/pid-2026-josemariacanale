import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPayDepositUseCase } from '@/src/application/use-cases/bookings/pay-deposit.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Booking } from '@/src/entities/models/booking';
import { z } from 'zod';

const payDepositInputSchema = z.object({
    bookingId: z.number().int().positive(),
});

function presenter(booking: Booking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'payDeposit Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
    }));
}

export type IPayDepositController = ReturnType<typeof payDepositController>;
export const payDepositController =
    (instrumentationService: IInstrumentationService, payDepositUseCase: IPayDepositUseCase) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'payDeposit Controller' }, async () => {
            const { data, error } = payDepositInputSchema.safeParse(input);
            if (error) throw new InputParseError('ID de reserva inválido', { cause: error });
            const booking = await payDepositUseCase(data.bookingId);
            return presenter(booking, instrumentationService);
        });
