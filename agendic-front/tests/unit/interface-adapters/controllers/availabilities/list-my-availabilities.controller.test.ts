import { listMyAvailabilitiesController } from '@/src/interface-adapters/controllers/availabilities/list-my-availabilities.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const horario = { id: 10, name: 'Horario', isDefault: true, timeZone: 'UTC' };
const verano = { id: 11, name: 'Verano', isDefault: false, timeZone: 'America/Argentina/Buenos_Aires' };
const detail = {
    ...horario,
    schedule: [[], [{ start: '09:00', end: '13:00' }], [], [], [], [], []],
    overrides: [{ date: '2026-12-24', ranges: [{ start: '09:00', end: '12:00' }] }],
};

const build = () => {
    const list = jest.fn().mockResolvedValue([horario, verano]);
    const get = jest.fn().mockResolvedValue(detail);
    return { controller: listMyAvailabilitiesController(instrumentation, signedIn, list, get), list, get };
};

describe('listMyAvailabilitiesController', () => {
    it('lists the Usuario’s Availability and opens none without an id', async () => {
        const { controller, get } = build();

        await expect(controller({})).resolves.toEqual({ availabilities: [horario, verano], open: null });
        expect(get).not.toHaveBeenCalled();
    });

    it('opens the chosen one with its schedule and overrides', async () => {
        const { controller, get } = build();

        await expect(controller({ availabilityId: 10 })).resolves.toEqual({ availabilities: [horario, verano], open: detail });
        expect(get).toHaveBeenCalledWith(10);
    });

    it('ignores an id that is not among the Usuario’s own', async () => {
        const { controller, get } = build();

        await expect(controller({ availabilityId: 99 })).resolves.toMatchObject({ open: null });
        expect(get).not.toHaveBeenCalled();
    });

    it('throws InputParseError for an id that is not a positive integer', async () => {
        const { controller, list } = build();

        await expect(controller({ availabilityId: 0 })).rejects.toBeInstanceOf(InputParseError);
        expect(list).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without listing', async () => {
        const list = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });

        await expect(listMyAvailabilitiesController(instrumentation, auth, list, jest.fn())({})).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(list).not.toHaveBeenCalled();
    });
});
