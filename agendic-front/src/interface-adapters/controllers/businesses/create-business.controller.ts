import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createBusinessSchema, type CreatedBusiness } from '@/src/entities/models/business';

function presenter({ business, branch }: CreatedBusiness, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createBusiness Presenter', op: 'serialize' }, () => ({
        id: business.id,
        name: business.name,
        slug: business.slug,
        branchId: branch.id,
    }));
}

export type ICreateBusinessController = ReturnType<typeof createBusinessController>;
/**
 * Crea el Negocio del Usuario con su primera Sucursal y las imágenes de esa Sucursal, de 1 a 5.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada, o no trae de 1 a 5 imágenes
 */
export const createBusinessController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createBusinessUseCase: ICreateBusinessUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createBusiness Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = createBusinessSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createBusinessUseCase(data), instrumentationService);
        });
