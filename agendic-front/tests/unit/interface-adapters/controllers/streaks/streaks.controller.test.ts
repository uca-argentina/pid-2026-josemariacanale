import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createStreakRewardController } from '@/src/interface-adapters/controllers/streaks/create-streak-reward.controller';
import { deleteStreakRewardController } from '@/src/interface-adapters/controllers/streaks/delete-streak-reward.controller';
import { getStreakProgramController } from '@/src/interface-adapters/controllers/streaks/get-streak-program.controller';
import { saveStreakProgramController } from '@/src/interface-adapters/controllers/streaks/save-streak-program.controller';
import { updateStreakRewardController } from '@/src/interface-adapters/controllers/streaks/update-streak-reward.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });
const reward = {
    id: 7,
    requiredCount: 5,
    repeatable: true,
    type: 'FREE_SERVICE' as const,
    value: null,
    description: null,
    service: { id: 9, name: 'Corte' },
    validForDays: 30,
};
const program = { active: true, burnAfterDays: 30, rewards: [reward] };
const percent = { requiredCount: 5, repeatable: false, type: 'PERCENT_DISCOUNT', value: 10, validForDays: null };

describe('getStreakProgramController', () => {
    it('returns the presented program of the scope', async () => {
        const useCase = jest.fn().mockResolvedValue({ ...program, internal: 'x', rewards: [{ ...reward, internal: 'x' }] });

        await expect(getStreakProgramController(instrumentation, signedIn(), useCase)({ businessId: 3 })).resolves.toEqual(program);
        expect(useCase).toHaveBeenCalledWith({ businessId: 3 });
    });

    it('reads the personal program without a businessId', async () => {
        const useCase = jest.fn().mockResolvedValue(program);

        await getStreakProgramController(instrumentation, signedIn(), useCase)({});
        expect(useCase).toHaveBeenCalledWith({});
    });

    it('throws InputParseError for a businessId that is not a number', async () => {
        const useCase = jest.fn();

        await expect(getStreakProgramController(instrumentation, signedIn(), useCase)({ businessId: '3' })).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(getStreakProgramController(instrumentation, signedOut(), useCase)({})).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('saveStreakProgramController', () => {
    it('saves and returns the presented program', async () => {
        const useCase = jest.fn().mockResolvedValue(program);

        await expect(saveStreakProgramController(instrumentation, signedIn(), useCase)({ active: true, burnAfterDays: 30 })).resolves.toEqual(program);
        expect(useCase).toHaveBeenCalledWith({ active: true, burnAfterDays: 30 });
    });

    it.each([
        ['no active', { burnAfterDays: 30 }],
        ['no Tiempo de quemada', { active: true }],
        ['a Tiempo de quemada below 1', { active: true, burnAfterDays: 0 }],
        ['a Tiempo de quemada above 365', { active: true, burnAfterDays: 366 }],
        ['a Tiempo de quemada with decimals', { active: true, burnAfterDays: 1.5 }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(saveStreakProgramController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(saveStreakProgramController(instrumentation, signedOut(), useCase)({ active: true, burnAfterDays: 30 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('createStreakRewardController', () => {
    it('creates and returns the presented Recompensa', async () => {
        const useCase = jest.fn().mockResolvedValue(reward);

        await expect(createStreakRewardController(instrumentation, signedIn(), useCase)({ ...percent, businessId: 3 })).resolves.toEqual(reward);
        expect(useCase).toHaveBeenCalledWith({ ...percent, businessId: 3 });
    });

    it('trims the text of a regalo', async () => {
        const useCase = jest.fn().mockResolvedValue(reward);

        await createStreakRewardController(instrumentation, signedIn(), useCase)({ requiredCount: 5, repeatable: false, type: 'GIFT', description: '  Un lavado ', validForDays: null });
        expect(useCase).toHaveBeenCalledWith(expect.objectContaining({ description: 'Un lavado' }));
    });

    it('drops the fields of the other types', async () => {
        const useCase = jest.fn().mockResolvedValue(reward);

        await createStreakRewardController(instrumentation, signedIn(), useCase)({ ...percent, description: 'x', serviceId: 9 });
        expect(useCase).toHaveBeenCalledWith(percent);
    });

    it.each([
        ['no cantidad de Turnos', { ...percent, requiredCount: undefined }],
        ['a cantidad de Turnos of 0', { ...percent, requiredCount: 0 }],
        ['a cantidad de Turnos with decimals', { ...percent, requiredCount: 1.5 }],
        ['an unknown type', { ...percent, type: 'CASHBACK' }],
        ['a percentage below 1', { ...percent, value: 0 }],
        ['a percentage above 100', { ...percent, value: 101 }],
        ['an amount of 0', { ...percent, type: 'AMOUNT_DISCOUNT', value: 0 }],
        ['an amount with more than two decimals', { ...percent, type: 'AMOUNT_DISCOUNT', value: 1.234 }],
        ['an amount above the maximum', { ...percent, type: 'AMOUNT_DISCOUNT', value: 100_000_000 }],
        ['a regalo without text', { requiredCount: 5, repeatable: false, type: 'GIFT', description: '   ', validForDays: null }],
        ['a regalo of 201 characters', { requiredCount: 5, repeatable: false, type: 'GIFT', description: 'a'.repeat(201), validForDays: null }],
        ['a Servicio gratis without a Servicio', { requiredCount: 5, repeatable: false, type: 'FREE_SERVICE', validForDays: null }],
        ['a vigencia of 0', { ...percent, validForDays: 0 }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(createStreakRewardController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(createStreakRewardController(instrumentation, signedOut(), useCase)(percent)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('updateStreakRewardController', () => {
    it('updates and returns the presented Recompensa', async () => {
        const useCase = jest.fn().mockResolvedValue(reward);

        await expect(updateStreakRewardController(instrumentation, signedIn(), useCase)({ ...percent, id: 7 })).resolves.toEqual(reward);
        expect(useCase).toHaveBeenCalledWith({ ...percent, id: 7 });
    });

    it.each([
        ['no id', percent],
        ['a percentage above 100', { ...percent, id: 7, value: 101 }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(updateStreakRewardController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(updateStreakRewardController(instrumentation, signedOut(), useCase)({ ...percent, id: 7 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('deleteStreakRewardController', () => {
    it('deletes the Recompensa', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await expect(deleteStreakRewardController(instrumentation, signedIn(), useCase)({ id: 7 })).resolves.toBeUndefined();
        expect(useCase).toHaveBeenCalledWith(7);
    });

    it('throws InputParseError without an id', async () => {
        const useCase = jest.fn();

        await expect(deleteStreakRewardController(instrumentation, signedIn(), useCase)({})).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(deleteStreakRewardController(instrumentation, signedOut(), useCase)({ id: 7 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
