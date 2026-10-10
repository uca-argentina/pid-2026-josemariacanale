import { deleteBusinessLogoUseCase } from '@/src/application/use-cases/businesses/delete-business-logo.use-case';
import { uploadBusinessLogoUseCase } from '@/src/application/use-cases/businesses/upload-business-logo.use-case';
import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { instrumentation } from '@/tests/unit/stubs';

const businessesWith = (stubs: Partial<IBusinessesRepository>) => stubs as IBusinessesRepository;

describe('Logo del Negocio use cases', () => {
    it('upload hands the file to the repository and returns the Negocio', async () => {
        const business = { id: 1, logoUrl: 'u' };
        const uploadBusinessLogo = jest.fn().mockResolvedValue(business);
        const file = new File(['x'], 'a.png');

        await expect(uploadBusinessLogoUseCase(instrumentation, businessesWith({ uploadBusinessLogo }))(1, file)).resolves.toBe(business);
        expect(uploadBusinessLogo).toHaveBeenCalledWith(1, file);
    });

    it('delete asks the repository to remove the Logo', async () => {
        const deleteBusinessLogo = jest.fn().mockResolvedValue(undefined);

        await deleteBusinessLogoUseCase(instrumentation, businessesWith({ deleteBusinessLogo }))(1);
        expect(deleteBusinessLogo).toHaveBeenCalledWith(1);
    });
});
