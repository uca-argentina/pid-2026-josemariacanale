import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetUserPageUseCase, PublicUserPage } from '@/src/application/use-cases/users/get-user-page.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { slugSchema } from '@/src/entities/models/business';
import type { PersonalService } from '@/src/entities/models/service';

/** Same fields as a Servicio of the page of a Sucursal: the booking flow is the same one. */
const presentService = (s: PersonalService) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    durationMinutes: s.durationMinutes,
    price: s.price,
    depositPercent: s.depositPercent,
});

function presenter({ name, slug, services, selectedService }: PublicUserPage, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getUserPage Presenter', op: 'serialize' }, () => ({
        user: { name, slug },
        services: services.map(presentService),
        selectedService: selectedService ? presentService(selectedService) : null,
    }));
}

/** The Servicio tramo is optional: without it, the page of the Usuario with no Servicio chosen yet. */
const inputSchema = z.object({ userSlug: slugSchema, serviceSlug: slugSchema.optional() });

export type IGetUserPageController = ReturnType<typeof getUserPageController>;
/**
 * Public: the page of a Usuario's Enlace de reserva (ADR 0021), `/u/<usuario>` or `/u/<usuario>/<servicio>`.
 *
 * @throws {InputParseError} a tramo does not have the format of an Enlace de reserva
 * @throws {NotFoundError} no Usuario has that Enlace de reserva, or none of their Servicios personales that tramo
 * @throws {ApiRequestError} the back failed
 */
export const getUserPageController =
    (instrumentationService: IInstrumentationService, getUserPageUseCase: IGetUserPageUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getUserPage Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Enlace de reserva', { cause: error });
            return presenter(await getUserPageUseCase(data), instrumentationService);
        });
