import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateBookingStatusUseCase } from '@/src/application/use-cases/bookings/update-booking-status.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { bookingStatusSchema, type Booking } from '@/src/entities/models/booking';
import { z } from 'zod';

const updateBookingStatusInputSchema = z.object({
    bookingId: z.number().int().positive(),
    status: bookingStatusSchema,
});

function presenter(booking: Booking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateBookingStatus Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
    }));
}

export type IUpdateBookingStatusController = ReturnType<typeof updateBookingStatusController>;
export const updateBookingStatusController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateBookingStatusUseCase: IUpdateBookingStatusUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateBookingStatus Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = updateBookingStatusInputSchema.safeParse(input);
            if (error) throw new InputParseError('Parámetros de actualización de estado inválidos', { cause: error });
            const booking = await updateBookingStatusUseCase(data.bookingId, data.status);
            return presenter(booking, instrumentationService);
        });
