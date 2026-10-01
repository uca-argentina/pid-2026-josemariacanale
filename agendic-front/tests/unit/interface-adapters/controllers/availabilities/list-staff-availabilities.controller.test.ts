import { listStaffAvailabilitiesController } from '@/src/interface-adapters/controllers/availabilities/list-staff-availabilities.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 };
const ana = { id: 3, userId: 7, name: 'Ana', email: 'ana@estudio.com' };
const martina = { id: 4, userId: 8, name: 'Martina', email: 'martina@estudio.com' };
const horario = {
    id: 10,
    employeeId: 3,
    name: 'Horario',
    isDefault: true,
    intervals: [{ weekday: 1, startTime: '09:00', endTime: '13:00' }],
};

const build = (overrides: { employees?: unknown[]; businesses?: unknown[]; availabilities?: unknown[]; overrides?: unknown[] } = {}) => {
    const listBusinesses = jest.fn().mockResolvedValue(overrides.businesses ?? [business]);
    const listEmployees = jest.fn().mockResolvedValue(overrides.employees ?? [martina, ana]);
    const listAvailabilities = jest.fn().mockResolvedValue(overrides.availabilities ?? [horario]);
    const listOverrides = jest.fn().mockResolvedValue(overrides.overrides ?? []);
    const controller = listStaffAvailabilitiesController(
        instrumentation,
        signedIn,
        listBusinesses,
        listEmployees,
        listAvailabilities,
        listOverrides,
    );
    return { controller, listBusinesses, listEmployees, listAvailabilities, listOverrides };
};

describe('listStaffAvailabilitiesController', () => {
    it('opens on the Dueño’s own Empleado, recognized by userId = ownerId, and lists the Staff', async () => {
        const { controller, listAvailabilities } = build();

        await expect(controller({})).resolves.toEqual({
            employees: [
                { id: 4, name: 'Martina', isOwner: false },
                { id: 3, name: 'Ana', isOwner: true },
            ],
            employeeId: 3,
            availabilities: [{ id: 10, name: 'Horario', isDefault: true, intervals: horario.intervals }],
            overrides: [],
        });
        expect(listAvailabilities).toHaveBeenCalledWith(3);
    });

    it('switches to the chosen Empleado of the Staff', async () => {
        const { controller, listAvailabilities } = build({ availabilities: [] });

        await expect(controller({ employeeId: 4 })).resolves.toMatchObject({ employeeId: 4, availabilities: [] });
        expect(listAvailabilities).toHaveBeenCalledWith(4);
    });

    it('lists the Anulaciones of the chosen Empleado, whitelisting their fields', async () => {
        const { controller, listOverrides } = build({
            overrides: [{ date: '2026-12-24', intervals: [{ startTime: '09:00', endTime: '12:00' }], coveredByEmployeeId: 4 }],
        });

        await expect(controller({ employeeId: 4 })).resolves.toMatchObject({
            overrides: [{ date: '2026-12-24', intervals: [{ startTime: '09:00', endTime: '12:00' }] }],
        });
        expect(listOverrides).toHaveBeenCalledWith(4);
    });

    it('falls back to the Dueño when the chosen Empleado is not in the Staff', async () => {
        const { controller } = build();
        await expect(controller({ employeeId: 99 })).resolves.toMatchObject({ employeeId: 3 });
    });

    it('returns null without listing anything else when the Usuario has no Negocio', async () => {
        const { controller, listEmployees, listAvailabilities } = build({ businesses: [] });

        await expect(controller({})).resolves.toBeNull();
        expect(listEmployees).not.toHaveBeenCalled();
        expect(listAvailabilities).not.toHaveBeenCalled();
    });

    it.each([{ employeeId: 'x' }, { employeeId: 0 }, { employeeId: 1.5 }])(
        'throws InputParseError for %j without listing',
        async (input) => {
            const { controller, listBusinesses } = build();
            await expect(controller(input)).rejects.toBeInstanceOf(InputParseError);
            expect(listBusinesses).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without listing', async () => {
        const listBusinesses = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        const controller = listStaffAvailabilitiesController(instrumentation, auth, listBusinesses, jest.fn(), jest.fn(), jest.fn());

        await expect(controller({})).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(listBusinesses).not.toHaveBeenCalled();
    });
});
