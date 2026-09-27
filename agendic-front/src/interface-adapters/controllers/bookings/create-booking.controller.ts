import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateBookingUseCase } from '@/src/application/use-cases/bookings/create-booking.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createBookingSchema, type Booking } from '@/src/entities/models/booking';

function presenter(booking: Booking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createBooking Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
    }));
}

export type ICreateBookingController = ReturnType<typeof createBookingController>;
export const createBookingController =
    (instrumentationService: IInstrumentationService, createBookingUseCase: ICreateBookingUseCase) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createBooking Controller' }, async () => {
            const { data, error } = createBookingSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid booking data', { cause: error });
            const booking = await createBookingUseCase(data);
            return presenter(booking, instrumentationService);
        });
