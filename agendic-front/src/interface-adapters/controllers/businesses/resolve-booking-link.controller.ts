import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IResolveBookingLinkUseCase } from '@/src/application/use-cases/businesses/resolve-booking-link.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ResolvedBookingLink } from '@/src/entities/models/booking-link';
import { slugSchema } from '@/src/entities/models/business';

/** Only what the router needs to pick the page: whose tramo it is. The page then asks for its own data. */
function presenter(resolved: ResolvedBookingLink, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'resolveBookingLink Presenter', op: 'serialize' }, () =>
        resolved.kind === 'business'
            ? { kind: 'business' as const, business: { name: resolved.business.name, slug: resolved.business.slug } }
            : { kind: 'user' as const, user: { name: resolved.user.name, slug: resolved.user.slug } },
    );
}

const inputSchema = z.object({ slug: slugSchema });

export type IResolveBookingLinkController = ReturnType<typeof resolveBookingLinkController>;
/**
 * Public: whose first tramo of an Enlace de reserva `<slug>` is (ADR 0026), a Negocio's or a Usuario's.
 *
 * @throws {InputParseError} the tramo does not have the format of an Enlace de reserva
 * @throws {NotFoundError} nobody has that Enlace de reserva
 * @throws {ApiRequestError} the back failed
 */
export const resolveBookingLinkController =
    (instrumentationService: IInstrumentationService, resolveBookingLinkUseCase: IResolveBookingLinkUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'resolveBookingLink Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Enlace de reserva', { cause: error });
            return presenter(await resolveBookingLinkUseCase(data), instrumentationService);
        });
