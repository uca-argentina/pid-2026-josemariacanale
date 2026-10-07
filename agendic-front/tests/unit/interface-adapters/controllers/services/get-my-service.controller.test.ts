import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { getMyServiceController } from '@/src/interface-adapters/controllers/services/get-my-service.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const service = {
    id: 100,
    branchId: 10,
    slug: 'masaje',
    name: 'Masaje',
    description: 'Relajante',
    category: 'SPA',
    durationMinutes: 60,
    price: 20000,
    depositPercent: 20,
    requiresApproval: true,
    hidden: false,
    prepMinutes: 15,
    dailyLimit: 6,
    slotInterval: 30,
    minimumNoticeMinutes: 60,
    employees: [
        { id: 1, name: 'Ana', availabilityId: 7 },
        { id: 2, name: 'Juan', availabilityId: 8 },
    ],
};
const branch = { id: 10, name: 'Centro', slug: 'centro', services: [service] };
const group = { business: { id: 1, name: 'Vitalia', slug: 'vitalia' }, role: 'owner', employeeId: 2, branches: [branch] };
const staff = [
    { id: 1, userId: 11, name: 'Ana', email: 'ana@estudio.com' },
    { id: 2, userId: 12, name: 'Juan', email: 'juan@estudio.com' },
    { id: 3, userId: 13, name: 'Sofía', email: 'sofia@estudio.com' },
];
const noStaff = () => jest.fn().mockRejectedValue(new Error('only the Dueño lists the Staff'));
const noDays = () => [[], [], [], [], [], [], []];
const mondayMorning = [[], [{ start: '09:00', end: '13:00' }], [], [], [], [], []];
const summaries = [
    { id: 7, name: 'Mañanas', isDefault: true, timeZone: 'UTC' },
    { id: 8, name: 'Tardes', isDefault: false, timeZone: 'UTC' },
];
const details = [
    { ...summaries[0], schedule: mondayMorning, overrides: [] },
    { ...summaries[1], schedule: noDays(), overrides: [] },
];
const mine = () => jest.fn().mockResolvedValue(summaries);
const detailOf = () => jest.fn(async (id: number) => details.find((d) => d.id === id)!);
const noMe = () => jest.fn().mockRejectedValue(new Error('a Servicio del Negocio does not need the Usuario'));
const noAvailabilities = () => jest.fn().mockRejectedValue(new Error('not attending: no Availability to load'));

describe('getMyServiceController', () => {
    it('finds the Servicio by the id of the path and presents it with its Negocio, its Sucursal and the Staff', async () => {
        const useCase = jest.fn().mockResolvedValue({ group, branch, service });
        const listEmployees = jest.fn().mockResolvedValue(staff);
        const listAvailabilities = mine();

        await expect(
            getMyServiceController(instrumentation, signedIn(), useCase, listEmployees, listAvailabilities, detailOf(), noMe())({ serviceId: '100' }),
        ).resolves.toEqual({
            kind: 'business',
            business: { id: 1, name: 'Vitalia', slug: 'vitalia' },
            role: 'owner',
            employeeId: 2,
            branch: { id: 10, name: 'Centro', slug: 'centro' },
            service: {
                id: 100,
                slug: 'masaje',
                name: 'Masaje',
                description: 'Relajante',
                category: 'SPA',
                durationMinutes: 60,
                price: 20000,
                depositPercent: 20,
                requiresApproval: true,
                hidden: false,
                prepMinutes: 15,
                dailyLimit: 6,
                slotInterval: 30,
                minimumNoticeMinutes: 60,
                offeredByMe: true,
                employees: [
                    { id: 1, name: 'Ana' },
                    { id: 2, name: 'Juan' },
                ],
            },
            staff: [
                { id: 1, name: 'Ana' },
                { id: 2, name: 'Juan' },
                { id: 3, name: 'Sofía' },
            ],
            myAvailabilityId: 8,
            availabilities: [
                { id: 7, name: 'Mañanas', isDefault: true, schedule: mondayMorning },
                { id: 8, name: 'Tardes', isDefault: false, schedule: noDays() },
            ],
        });
        expect(useCase).toHaveBeenCalledWith({ serviceId: 100 });
        expect(listEmployees).toHaveBeenCalledWith(1);
        expect(listAvailabilities).toHaveBeenCalledWith();
    });

    it('presents a Servicio personal with the Usuario\'s Enlace de reserva and all their Availability', async () => {
        const personal: Record<string, unknown> = { ...service, branchId: null, availabilityId: 7 };
        delete personal.employees;
        const useCase = jest.fn().mockResolvedValue({ group: null, branch: null, service: personal });
        const getMe = jest.fn().mockResolvedValue({ name: 'Ana', slug: 'ana' });

        await expect(
            getMyServiceController(instrumentation, signedIn(), useCase, noStaff(), mine(), detailOf(), getMe)({ serviceId: '100' }),
        ).resolves.toEqual({
            kind: 'personal',
            userSlug: 'ana',
            role: 'owner',
            service: {
                id: 100,
                slug: 'masaje',
                name: 'Masaje',
                description: 'Relajante',
                category: 'SPA',
                durationMinutes: 60,
                price: 20000,
                depositPercent: 20,
                requiresApproval: true,
                hidden: false,
                prepMinutes: 15,
                dailyLimit: 6,
                slotInterval: 30,
                minimumNoticeMinutes: 60,
                offeredByMe: true,
                employees: [],
            },
            staff: null,
            myAvailabilityId: 7,
            availabilities: [
                { id: 7, name: 'Mañanas', isDefault: true, schedule: mondayMorning },
                { id: 8, name: 'Tardes', isDefault: false, schedule: noDays() },
            ],
        });
    });

    it('does not load Availability when the Usuario does not attend the Servicio', async () => {
        const useCase = jest.fn().mockResolvedValue({ group: { ...group, employeeId: 3 }, branch, service });
        const listAvailabilities = noAvailabilities();

        const detail = await getMyServiceController(
            instrumentation,
            signedIn(),
            useCase,
            jest.fn().mockResolvedValue(staff),
            listAvailabilities,
            detailOf(),
            noMe(),
        )({ serviceId: '100' });
        expect(detail.myAvailabilityId).toBeNull();
        expect(detail.availabilities).toBeNull();
        expect(listAvailabilities).not.toHaveBeenCalled();
    });

    it('does not list the Staff for an Empleado who is not the Dueño', async () => {
        const useCase = jest.fn().mockResolvedValue({ group: { ...group, role: 'employee' }, branch, service });
        const listEmployees = noStaff();

        const detail = await getMyServiceController(instrumentation, signedIn(), useCase, listEmployees, mine(), detailOf(), noMe())({
            serviceId: '100',
        });
        expect(detail.staff).toBeNull();
        expect(listEmployees).not.toHaveBeenCalled();
    });

    it.each([
        ['an id that is not a number', { serviceId: 'masaje' }],
        ['a fractional id', { serviceId: '1.5' }],
        ['a zero id', { serviceId: '0' }],
        ['an empty id', { serviceId: '' }],
        ['no id', {}],
    ])('throws InputParseError for %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(getMyServiceController(instrumentation, signedIn(), useCase, noStaff(), noAvailabilities(), detailOf(), noMe())(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(getMyServiceController(instrumentation, auth, useCase, noStaff(), noAvailabilities(), detailOf(), noMe())({ serviceId: '100' })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
