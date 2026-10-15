import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMarkEmployeeNoShowByLinkUseCase } from '@/src/application/use-cases/bookings/mark-employee-no-show-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientBooking } from '@/src/entities/models/client-booking';
import { presentClientBooking } from '@/src/interface-adapters/presenters/client-booking.presenter';

function presenter(booking: ClientBooking, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'markEmployeeNoShowByLink Presenter', op: 'serialize' }, () => presentClientBooking(booking));
}

const inputSchema = z.object({ link: z.string().trim().min(1) });

export type IMarkEmployeeNoShowByLinkController = ReturnType<typeof markEmployeeNoShowByLinkController>;

/**
 * Marca la Ausencia del Anfitrión en el Turno de un Enlace del Turno: el Cliente avisa que quien lo atiende no vino.
 *
 * Público: el Enlace, no una Sesión ni un acceso, prueba que se tiene el Turno (ADR 0022).
 *
 * @throws {InputParseError} `link` falta o está vacío
 * @throws {NotFoundError} el Enlace no es de ningún Turno
 * @throws {BookingStateError} el Turno no está aceptado, no empezó, venció el plazo, tiene Ausencia del Invitado, ya tiene la del Anfitrión o no admite marcarla
 */
export const markEmployeeNoShowByLinkController =
    (instrumentationService: IInstrumentationService, markEmployeeNoShowByLinkUseCase: IMarkEmployeeNoShowByLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'markEmployeeNoShowByLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await markEmployeeNoShowByLinkUseCase(data), instrumentationService);
        });
