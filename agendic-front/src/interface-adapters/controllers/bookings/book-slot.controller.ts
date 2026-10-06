import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IBookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Booking } from '@/src/entities/models/booking';

function presenter(booking: Booking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'bookSlot Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
        notes: booking.notes ?? null,
        employeeName: booking.employeeName ?? null,
    }));
}

const inputSchema = z.object({
    serviceId: z.number().int().positive(),
    startsAt: z.iso.datetime(),
    clientName: z.string().trim().min(1),
    clientEmail: z.string().trim().pipe(z.email()),
    // Comentario del Turno: the back's limit (ticket 03, back PR #37). Blank is sent as no Comentario.
    notes: z.string().trim().max(500).optional(),
});

export type IBookSlotController = ReturnType<typeof bookSlotController>;
// Public: the Cliente reserves without a Sesión (ADR 0005). SlotTakenError goes through untouched:
// the framework layer shows it as recoverable and does not report it.
export const bookSlotController =
    (instrumentationService: IInstrumentationService, bookSlotUseCase: IBookSlotUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'bookSlot Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Turno', { cause: error });
            return presenter(await bookSlotUseCase(data), instrumentationService);
        });
