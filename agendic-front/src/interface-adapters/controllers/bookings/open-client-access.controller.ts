import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IOpenClientAccessUseCase } from '@/src/application/use-cases/bookings/open-client-access.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ClientAccess } from '@/src/entities/models/client-booking';

function presenter(access: ClientAccess, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'openClientAccess Presenter', op: 'serialize' }, () => ({
        access: access.access,
        expiresAt: access.expiresAt,
    }));
}

const inputSchema = z.object({
    email: z.string().trim().pipe(z.email()),
    code: z.string().trim().min(1),
});

export type IOpenClientAccessController = ReturnType<typeof openClientAccessController>;

/**
 * Abre el acceso a Mis turnos con un Código de verificación ya pedido.
 *
 * Público: el Cliente no tiene Sesión (ADR 0005).
 *
 * @throws {InputParseError} `email` o `code` no son válidos
 * @throws {InvalidVerificationCodeError} el código no es válido para email, o venció
 */
export const openClientAccessController =
    (instrumentationService: IInstrumentationService, openClientAccessUseCase: IOpenClientAccessUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'openClientAccess Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await openClientAccessUseCase(data), instrumentationService);
        });
