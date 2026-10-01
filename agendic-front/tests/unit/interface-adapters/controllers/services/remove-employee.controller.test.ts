import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { removeEmployeeController } from '@/src/interface-adapters/controllers/services/remove-employee.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const input = { serviceId: 100, employeeId: 2 };

describe('removeEmployeeController', () => {
    it('makes the Empleado stop offering the Servicio and presents how many Turnos got cancelled', async () => {
        const useCase = jest.fn().mockResolvedValue({ cancelledBookings: 2 });

        await expect(removeEmployeeController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual({ cancelledBookings: 2 });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it.each([
        ['a missing serviceId', { employeeId: 2 }],
        ['a missing employeeId', { serviceId: 100 }],
        ['an employeeId that is not a number', { ...input, employeeId: '2' }],
        ['a fractional serviceId', { ...input, serviceId: 1.5 }],
        ['a zero employeeId', { ...input, employeeId: 0 }],
        ['no input', undefined],
    ])('throws InputParseError for %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(removeEmployeeController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(removeEmployeeController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
