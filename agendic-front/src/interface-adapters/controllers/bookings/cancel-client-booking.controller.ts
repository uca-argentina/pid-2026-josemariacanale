import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICancelClientBookingUseCase } from '@/src/application/use-cases/bookings/cancel-client-booking.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'cancelClientBooking Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        status: booking.status,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        timeZone: booking.timeZone,
        notes: booking.notes,
        clientName: booking.clientName,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        service: booking.service,
        employeeName: booking.employeeName,
        business: booking.business,
        branch: booking.branch,
    }));
}

const inputSchema = z.object({ access: z.string().trim().min(1), bookingId: z.number().int().positive() });

export type ICancelClientBookingController = ReturnType<typeof cancelClientBookingController>;

/**
 * Cancela un Turno pendiente o aceptado del Cliente; su horario queda libre.
 *
 * Público: el acceso, no una Sesión, prueba quién es (ADR 0022).
 *
 * @throws {InputParseError} `access` o `bookingId` no son válidos
 * @throws {ClientAccessExpiredError} el acceso falta o venció
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado, o ya empezó
 */
export const cancelClientBookingController =
    (instrumentationService: IInstrumentationService, cancelClientBookingUseCase: ICancelClientBookingUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'cancelClientBooking Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await cancelClientBookingUseCase(data), instrumentationService);
        });
