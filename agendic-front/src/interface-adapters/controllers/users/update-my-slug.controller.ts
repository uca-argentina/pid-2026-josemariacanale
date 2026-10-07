import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateMySlugUseCase } from '@/src/application/use-cases/users/update-my-slug.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { slugSchema } from '@/src/entities/models/business';
import type { Me } from '@/src/entities/models/user';

function presenter(me: Me, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateMySlug Presenter', op: 'serialize' }, () => ({ slug: me.slug }));
}

/** Same format as the Negocio's Enlace de reserva. */
const inputSchema = z.object({ slug: slugSchema });

export type IUpdateMySlugController = ReturnType<typeof updateMySlugController>;
/**
 * The Usuario picks or changes their Enlace de reserva, `/u/<slug>`.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} it does not have the format of an Enlace de reserva
 * @throws {SlugTakenError} another Usuario already uses it
 * @throws {InvalidSlugError} the back rejected its format
 * @throws {ApiRequestError} the back failed
 */
export const updateMySlugController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateMySlugUseCase: IUpdateMySlugUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateMySlug Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await updateMySlugUseCase(data), instrumentationService);
        });
