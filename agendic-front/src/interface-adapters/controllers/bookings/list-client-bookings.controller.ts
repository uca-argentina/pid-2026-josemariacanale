import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListClientBookingsUseCase } from '@/src/application/use-cases/bookings/list-client-bookings.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';

function presenter(bookings: ClientBooking[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listClientBookings Presenter', op: 'serialize' }, () =>
        bookings.map((b) => ({
            id: b.id,
            status: b.status,
            startsAt: b.startsAt,
            endsAt: b.endsAt,
            timeZone: b.timeZone,
            notes: b.notes,
            clientName: b.clientName,
            serviceId: b.serviceId,
            employeeId: b.employeeId,
            service: b.service,
            employeeName: b.employeeName,
            business: b.business,
            branch: b.branch,
        })),
    );
}

const inputSchema = z.object({ access: z.string().trim().min(1) });

export type IListClientBookingsController = ReturnType<typeof listClientBookingsController>;

/**
 * Mis turnos del Cliente: todos sus Turnos, en cualquier Negocio o Servicio personal.
 *
 * Público: el acceso, no una Sesión, prueba quién es (ADR 0022).
 *
 * @throws {InputParseError} `access` falta
 * @throws {ClientAccessExpiredError} el acceso falta o venció
 */
export const listClientBookingsController =
    (instrumentationService: IInstrumentationService, listClientBookingsUseCase: IListClientBookingsUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listClientBookings Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await listClientBookingsUseCase(data.access), instrumentationService);
        });
