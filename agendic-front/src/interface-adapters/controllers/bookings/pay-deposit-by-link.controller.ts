import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPayDepositByLinkUseCase } from '@/src/application/use-cases/bookings/pay-deposit-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'payDepositByLink Presenter', op: 'serialize' }, () => ({
        id: booking.id,
        status: booking.status,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        timeZone: booking.timeZone,
        notes: booking.notes,
        clientName: booking.clientName,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        employeeChosen: booking.employeeChosen,
        depositAmount: booking.depositAmount,
        depositPaidAt: booking.depositPaidAt,
        employeeNoShowAt: booking.employeeNoShowAt,
        canMarkEmployeeNoShow: booking.canMarkEmployeeNoShow,
        service: booking.service,
        employeeName: booking.employeeName,
        business: booking.business,
        branch: booking.branch,
        user: booking.user,
    }));
}

const inputSchema = z.object({ link: z.string().trim().min(1) });

export type IPayDepositByLinkController = ReturnType<typeof payDepositByLinkController>;

/**
 * Paga la Seña del Turno de un Enlace del Turno. Es simulado: Agendic no cobra.
 *
 * Público: el Enlace, no una Sesión ni un acceso, prueba que se tiene el Turno (ADR 0022).
 *
 * @throws {InputParseError} `link` falta o está vacío
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no está pendiente ni aceptado, ya empezó, no tiene Seña o ya la tiene pagada
 */
export const payDepositByLinkController =
    (instrumentationService: IInstrumentationService, payDepositByLinkUseCase: IPayDepositByLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'payDepositByLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await payDepositByLinkUseCase(data), instrumentationService);
        });
