import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUploadBusinessLogoUseCase } from '@/src/application/use-cases/businesses/upload-business-logo.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { uploadBusinessLogoSchema, type Business } from '@/src/entities/models/business';

function presenter(business: Business, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'uploadBusinessLogo Presenter', op: 'serialize' }, () => ({
        id: business.id,
        logoUrl: business.logoUrl,
    }));
}

export type IUploadBusinessLogoController = ReturnType<typeof uploadBusinessLogoController>;
/**
 * Sube el Logo del Negocio.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no es válido
 */
export const uploadBusinessLogoController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        uploadBusinessLogoUseCase: IUploadBusinessLogoUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'uploadBusinessLogo Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = uploadBusinessLogoSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await uploadBusinessLogoUseCase(data.businessId, data.file), instrumentationService);
        });
