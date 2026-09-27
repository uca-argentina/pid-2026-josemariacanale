import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { retireEmployeeController } from '@/src/interface-adapters/controllers/employees/retire-employee.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });

describe('retireEmployeeController', () => {
    it('retires the Empleado', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await retireEmployeeController(instrumentation, signedIn(), useCase)({ employeeId: 4 });
        expect(useCase).toHaveBeenCalledWith(4);
    });

    it.each([
        ['a missing employeeId', {}],
        ['a non-numeric employeeId', { employeeId: '4' }],
        ['no input', undefined],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(retireEmployeeController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(retireEmployeeController(instrumentation, auth, useCase)({ employeeId: 4 })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
