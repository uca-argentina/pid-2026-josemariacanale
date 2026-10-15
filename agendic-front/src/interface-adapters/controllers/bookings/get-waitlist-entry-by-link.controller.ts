import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetWaitlistEntryByLinkUseCase } from '@/src/application/use-cases/bookings/get-waitlist-entry-by-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { WaitlistEntryView } from '@/src/entities/models/waitlist';

function presenter(entry: WaitlistEntryView, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getWaitlistEntryByLink Presenter', op: 'serialize' }, () => ({
        date: entry.date,
        timeZone: entry.timeZone,
        left: entry.left,
        service: { name: entry.service.name, slug: entry.service.slug },
        business: entry.business && { name: entry.business.name, slug: entry.business.slug },
        branch: entry.branch && { name: entry.branch.name, slug: entry.branch.slug },
        user: entry.user && { slug: entry.user.slug },
    }));
}

const inputSchema = z.object({ link: z.string().trim().min(1) });

export type IGetWaitlistEntryByLinkController = ReturnType<typeof getWaitlistEntryByLinkController>;

/**
 * Abre la Anotación de un enlace de Salir de la Lista de espera. Es público: el enlace es la credencial, sin Sesión
 * (ADR 0034).
 */
export const getWaitlistEntryByLinkController =
    (instrumentationService: IInstrumentationService, getWaitlistEntryByLinkUseCase: IGetWaitlistEntryByLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getWaitlistEntryByLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError(`Invalid Anotación link "${input.link}"`, { cause: error });
            return presenter(await getWaitlistEntryByLinkUseCase(data), instrumentationService);
        });
