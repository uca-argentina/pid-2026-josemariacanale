import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRescheduleClientBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-client-booking.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'rescheduleClientBooking Presenter', op: 'serialize' }, () => ({
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

const inputSchema = z.object({
    access: z.string().trim().min(1),
    bookingId: z.number().int().positive(),
    startsAt: z.iso.datetime(),
});

export type IRescheduleClientBookingController = ReturnType<typeof rescheduleClientBookingController>;

/**
 * Reagenda un Turno pendiente o aceptado del Cliente al Horario reservable elegido.
 *
 * Público: el acceso, no una Sesión, prueba quién es (ADR 0022).
 *
 * @throws {InputParseError} `access`, `bookingId` o `startsAt` no son válidos
 * @throws {ClientAccessExpiredError} el acceso falta o venció
 * @throws {NotFoundError} el Turno no existe
 * @throws {SlotTakenError} el horario choca con otro Turno del Empleado
 * @throws {SlotUnavailableError} el horario ya no es un Horario reservable
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado
 */
export const rescheduleClientBookingController =
    (instrumentationService: IInstrumentationService, rescheduleClientBookingUseCase: IRescheduleClientBookingUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'rescheduleClientBooking Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await rescheduleClientBookingUseCase(data), instrumentationService);
        });
