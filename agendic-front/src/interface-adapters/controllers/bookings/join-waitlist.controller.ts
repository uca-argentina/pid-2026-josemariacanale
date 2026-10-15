import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IJoinWaitlistUseCase } from '@/src/application/use-cases/bookings/join-waitlist.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { WaitlistEntry } from '@/src/entities/models/waitlist';

function presenter(entry: WaitlistEntry, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'joinWaitlist Presenter', op: 'serialize' }, () => ({
        serviceId: entry.serviceId,
        date: entry.date,
    }));
}

const inputSchema = z.object({
    serviceId: z.number().int().positive(),
    date: z.iso.date(),
    clientName: z.string().trim().min(1),
    clientEmail: z.string().trim().pipe(z.email()),
    // El Código de verificación ya pedido para clientEmail (ADR 0022).
    code: z.string().trim().min(1),
});

export type IJoinWaitlistController = ReturnType<typeof joinWaitlistController>;

/**
 * Anotarse en la Lista de espera. Es público: el Cliente se anota sin Sesión (ADR 0005). Los errores del back
 * pasan sin tocar: la capa de `app/` los distingue por clase.
 */
export const joinWaitlistController =
    (instrumentationService: IInstrumentationService, joinWaitlistUseCase: IJoinWaitlistUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'joinWaitlist Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Anotación', { cause: error });
            return presenter(await joinWaitlistUseCase(data), instrumentationService);
        });
