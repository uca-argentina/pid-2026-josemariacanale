import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { changeEmployeeAvailabilityController } from '@/src/interface-adapters/controllers/services/change-employee-availability.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const input = { serviceId: 100, employeeId: 2, availabilityId: 9 };

describe('changeEmployeeAvailabilityController', () => {
    it('changes the Availability and presents the name of the Servicio', async () => {
        const useCase = jest.fn().mockResolvedValue({ id: 100, name: 'Masaje', price: 20000 });

        await expect(changeEmployeeAvailabilityController(instrumentation, signedIn(), useCase)(input)).resolves.toEqual({
            name: 'Masaje',
        });
        expect(useCase).toHaveBeenCalledWith(input);
    });

    it.each([
        ['a missing serviceId', { employeeId: 2, availabilityId: 9 }],
        ['a missing employeeId', { serviceId: 100, availabilityId: 9 }],
        ['a missing availabilityId', { serviceId: 100, employeeId: 2 }],
        ['an availabilityId that is not a number', { ...input, availabilityId: '9' }],
        ['a zero availabilityId', { ...input, availabilityId: 0 }],
        ['a fractional serviceId', { ...input, serviceId: 1.5 }],
        ['no input', undefined],
    ])('throws InputParseError for %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(changeEmployeeAvailabilityController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(
            InputParseError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(changeEmployeeAvailabilityController(instrumentation, auth, useCase)(input)).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
