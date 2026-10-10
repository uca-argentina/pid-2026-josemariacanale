import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { deleteBusinessLogoController } from '@/src/interface-adapters/controllers/businesses/delete-business-logo.controller';
import { uploadBusinessLogoController } from '@/src/interface-adapters/controllers/businesses/upload-business-logo.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u', name: 'Ana', email: 'a@a.com' }) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });
const file = new File(['x'], 'a.png', { type: 'image/png' });

describe('Logo del Negocio controllers', () => {
    it('upload passes the Negocio and the file, and presents only id and logoUrl', async () => {
        const useCase = jest.fn().mockResolvedValue({ id: 1, name: 'Estudio', logoUrl: 'u', ownerId: 7 });

        await expect(uploadBusinessLogoController(instrumentation, signedIn(), useCase)({ businessId: 1, file })).resolves.toEqual({
            id: 1,
            logoUrl: 'u',
        });
        expect(useCase).toHaveBeenCalledWith(1, file);
    });

    it('delete passes the Negocio to the use case', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await deleteBusinessLogoController(instrumentation, signedIn(), useCase)({ businessId: 1 });
        expect(useCase).toHaveBeenCalledWith(1);
    });

    it.each([
        ['upload without a file', uploadBusinessLogoController, { businessId: 1 }],
        ['delete without a Negocio', deleteBusinessLogoController, {}],
    ])('throws InputParseError for %s', async (_case, controller, bad) => {
        const useCase = jest.fn();

        await expect(controller(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it.each([
        ['upload', uploadBusinessLogoController, { businessId: 1, file }],
        ['delete', deleteBusinessLogoController, { businessId: 1 }],
    ])('%s throws UnauthenticatedError without a Sesión', async (_case, controller, input) => {
        const useCase = jest.fn();

        await expect(controller(instrumentation, signedOut(), useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
