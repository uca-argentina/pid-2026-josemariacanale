import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type {
    BranchWithImages,
    IListBranchesWithImagesUseCase,
} from '@/src/application/use-cases/branches/list-branches-with-images.use-case';
import { InputParseError } from '@/src/entities/errors/common';

function presenter(items: BranchWithImages[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listBranchesWithImages Presenter', op: 'serialize' }, () =>
        items.map(({ branch, images }) => ({
            id: branch.id,
            name: branch.name,
            address: branch.address,
            timeZone: branch.timeZone,
            slug: branch.slug,
            description: branch.description,
            images: images.map((i) => ({ id: i.id, url: i.url })),
        })),
    );
}

const inputSchema = z.object({ businessId: z.number() });

export type IListBranchesWithImagesController = ReturnType<typeof listBranchesWithImagesController>;
/**
 * Lista las Sucursales del Negocio para el panel, cada una con sus Imágenes en el orden de la galería.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const listBranchesWithImagesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listBranchesWithImagesUseCase: IListBranchesWithImagesUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listBranchesWithImages Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await listBranchesWithImagesUseCase(data.businessId), instrumentationService);
        });
