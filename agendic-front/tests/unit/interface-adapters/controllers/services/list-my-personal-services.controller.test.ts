import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { listMyPersonalServicesController } from '@/src/interface-adapters/controllers/services/list-my-personal-services.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'u', name: 'Ana', email: 'a@x.com' }) });
const personal = {
    id: 200,
    slug: 'clase',
    name: 'Clase',
    description: null,
    category: 'ACADEMIA',
    durationMinutes: 45,
    price: 5000,
    depositPercent: null,
    requiresApproval: false,
    hidden: true,
    prepMinutes: 0,
    dailyLimit: null,
    slotInterval: null,
    minimumNoticeMinutes: 0,
    availabilityId: 7,
};

describe('listMyPersonalServicesController', () => {
    it('presents the Enlace de reserva, the Servicios personales and the Availability to pick from', async () => {
        const controller = listMyPersonalServicesController(
            instrumentation,
            signedIn(),
            jest.fn().mockResolvedValue([personal]),
            jest.fn().mockResolvedValue({ name: 'Ana', slug: null }),
            jest.fn().mockResolvedValue([{ id: 7, name: 'Mañanas', isDefault: true, timeZone: 'UTC' }]),
        );

        await expect(controller()).resolves.toEqual({
            slug: null,
            services: [
                {
                    id: 200,
                    slug: 'clase',
                    name: 'Clase',
                    description: null,
                    category: 'ACADEMIA',
                    durationMinutes: 45,
                    price: 5000,
                    hidden: true,
                    availabilityId: 7,
                },
            ],
            availabilities: [{ id: 7, name: 'Mañanas', isDefault: true }],
        });
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use cases', async () => {
        const list = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listMyPersonalServicesController(instrumentation, auth, list, jest.fn(), jest.fn())()).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(list).not.toHaveBeenCalled();
    });
});
