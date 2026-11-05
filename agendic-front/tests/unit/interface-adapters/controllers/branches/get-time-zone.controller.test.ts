import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { getTimeZoneController } from '@/src/interface-adapters/controllers/branches/get-time-zone.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const location = { lat: -34.6, lng: -58.4 };

describe('getTimeZoneController', () => {
    it('returns the zona horaria of the punto', async () => {
        const useCase = jest.fn().mockResolvedValue('America/Argentina/Buenos_Aires');

        await expect(getTimeZoneController(instrumentation, signedIn(), useCase)(location)).resolves.toEqual({
            timeZone: 'America/Argentina/Buenos_Aires',
        });
        expect(useCase).toHaveBeenCalledWith(location);
    });

    it.each([
        ['no input', undefined],
        ['a missing lng', { lat: 0 }],
        ['a lat out of range', { lat: 95, lng: 0 }],
        ['a non-numeric lat', { lat: '0', lng: 0 }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(getTimeZoneController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(getTimeZoneController(instrumentation, auth, useCase)(location)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
