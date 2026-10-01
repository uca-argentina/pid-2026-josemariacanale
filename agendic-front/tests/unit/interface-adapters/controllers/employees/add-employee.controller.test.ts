import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { addEmployeeController } from '@/src/interface-adapters/controllers/employees/add-employee.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const input = { businessId: 1, email: 'martina@estudio.com' };

describe('addEmployeeController', () => {
    it('returns the presented Invitación', async () => {
        const useCase = jest.fn().mockResolvedValue({ id: 4, email: 'martina@estudio.com', expiresAt: 'x', extra: 1 });

        await expect(addEmployeeController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual({
            id: 4,
            expiresAt: 'x',
            email: 'martina@estudio.com',
        });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it.each([
        ['a missing businessId', { ...input, businessId: undefined }],
        ['an invalid email', { ...input, email: 'martina' }],
        ['no input', undefined],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(addEmployeeController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(addEmployeeController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
