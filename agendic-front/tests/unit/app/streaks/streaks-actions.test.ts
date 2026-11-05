import {
    createStreakRewardAction,
    deleteStreakRewardAction,
    saveStreakProgramAction,
    updateStreakRewardAction,
} from '@/app/(app)/streaks/actions';
import { REWARD_FIELD_MESSAGES } from '@/app/(app)/streaks/_components/streak-form';
import { UnauthenticatedError, UnauthorizedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { FreeServiceNotAllowedError } from '@/src/entities/errors/streak';

const mockControllers: Record<string, jest.Mock> = {
    ISaveStreakProgramController: jest.fn(),
    ICreateStreakRewardController: jest.fn(),
    IUpdateStreakRewardController: jest.fn(),
    IDeleteStreakRewardController: jest.fn(),
};
const mockReport = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => mockControllers[key] ?? { report: mockReport },
}));
jest.mock('next/cache', () => ({ refresh: () => mockRefresh() }));
jest.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`REDIRECT:${path}`);
    },
    unstable_rethrow: (error: Error) => {
        if (/^REDIRECT/.test(error.message)) throw error;
    },
}));

const percent = { requiredCount: 5, repeatable: false, type: 'PERCENT_DISCOUNT' as const, value: 10, validForDays: null };

beforeEach(() => jest.clearAllMocks());

describe('saveStreakProgramAction', () => {
    const input = { businessId: 3, active: true, burnAfterDays: 30 };

    it('passes the input to the controller and refreshes', async () => {
        mockControllers.ISaveStreakProgramController.mockResolvedValue({});

        await expect(saveStreakProgramAction(input)).resolves.toEqual({ ok: true });
        expect(mockControllers.ISaveStreakProgramController).toHaveBeenCalledWith(input);
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('puts the 400 under the Tiempo de quemada', async () => {
        mockControllers.ISaveStreakProgramController.mockRejectedValue(new InputParseError('burnAfterDays must not be greater than 365'));

        await expect(saveStreakProgramAction(input)).resolves.toEqual({ ok: false, field: 'burnAfterDays', message: 'Ingresá una cantidad de días entre 1 y 365.' });
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('says only the Dueño can change them on a 403, without reporting', async () => {
        mockControllers.ISaveStreakProgramController.mockRejectedValue(new UnauthorizedError('Only the Dueño of Business 3 can change its Rachas'));

        await expect(saveStreakProgramAction(input)).resolves.toEqual({ ok: false, message: 'Solo el Dueño puede cambiar las Rachas del Negocio.' });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('sends an expired Sesión to Iniciar sesión', async () => {
        mockControllers.ISaveStreakProgramController.mockRejectedValue(new UnauthenticatedError('x'));

        await expect(saveStreakProgramAction(input)).rejects.toThrow('REDIRECT:/sign-in');
    });

    it('reports anything else and answers a generic message', async () => {
        const failure = new ApiRequestError('boom', { status: 500 });
        mockControllers.ISaveStreakProgramController.mockRejectedValue(failure);

        await expect(saveStreakProgramAction(input)).resolves.toEqual({ ok: false, message: 'No pudimos guardar las Rachas. Intentá de nuevo.' });
        expect(mockReport).toHaveBeenCalledWith(failure);
    });
});

describe('createStreakRewardAction', () => {
    it('passes the Recompensa and the scope to the controller and refreshes', async () => {
        mockControllers.ICreateStreakRewardController.mockResolvedValue({});

        await expect(createStreakRewardAction(3, percent)).resolves.toEqual({ ok: true });
        expect(mockControllers.ICreateStreakRewardController).toHaveBeenCalledWith({ ...percent, businessId: 3 });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('sends no businessId in the personal scope', async () => {
        mockControllers.ICreateStreakRewardController.mockResolvedValue({});

        await createStreakRewardAction(undefined, percent);
        expect(mockControllers.ICreateStreakRewardController).toHaveBeenCalledWith(percent);
    });

    it('puts the 422 under the Servicio', async () => {
        mockControllers.ICreateStreakRewardController.mockRejectedValue(new FreeServiceNotAllowedError('Service 9 cannot be a free Service for this program'));

        await expect(createStreakRewardAction(3, { ...percent, type: 'FREE_SERVICE', serviceId: 9 } as never)).resolves.toEqual({
            ok: false,
            field: 'serviceId',
            message: 'Ese Servicio ya no se puede regalar: elegí otro.',
        });
    });

    it.each([
        ['PERCENT_DISCOUNT', 'value'],
        ['AMOUNT_DISCOUNT', 'value'],
        ['GIFT', 'description'],
        ['FREE_SERVICE', 'serviceId'],
    ] as const)('puts the 400 of a %s under %s', async (type, field) => {
        mockControllers.ICreateStreakRewardController.mockRejectedValue(new InputParseError('x'));

        await expect(createStreakRewardAction(3, { ...percent, type } as never)).resolves.toEqual({ ok: false, field, message: REWARD_FIELD_MESSAGES[type] });
    });
});

describe('a 400 about a field every type has', () => {
    it.each([
        ['requiredCount', 'requiredCount must not be less than 1'],
        ['validForDays', 'validForDays must not be less than 1'],
    ] as const)('goes under %s', async (field, message) => {
        mockControllers.ICreateStreakRewardController.mockRejectedValue(new InputParseError(message));

        await expect(createStreakRewardAction(3, percent)).resolves.toEqual({ ok: false, field, message: REWARD_FIELD_MESSAGES[field] });
    });
});

describe('a 404 from a Negocio', () => {
    it('says the Negocio is gone when saving the program', async () => {
        mockControllers.ISaveStreakProgramController.mockRejectedValue(new NotFoundError('Business not found'));

        await expect(saveStreakProgramAction({ businessId: 3, active: true, burnAfterDays: 30 })).resolves.toEqual({ ok: false, message: 'Ese Negocio ya no existe.' });
    });

    it('says the Negocio is gone when creating a Recompensa', async () => {
        mockControllers.ICreateStreakRewardController.mockRejectedValue(new NotFoundError('Business not found'));

        await expect(createStreakRewardAction(3, percent)).resolves.toEqual({ ok: false, message: 'Ese Negocio ya no existe.' });
    });
});

describe('updateStreakRewardAction', () => {
    it('passes the id and the Recompensa to the controller and refreshes', async () => {
        mockControllers.IUpdateStreakRewardController.mockResolvedValue({});

        await expect(updateStreakRewardAction(7, percent)).resolves.toEqual({ ok: true });
        expect(mockControllers.IUpdateStreakRewardController).toHaveBeenCalledWith({ ...percent, id: 7 });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('says the Recompensa is gone on a 404, and refreshes the list', async () => {
        mockControllers.IUpdateStreakRewardController.mockRejectedValue(new NotFoundError('Streak reward 7 not found'));

        await expect(updateStreakRewardAction(7, percent)).resolves.toEqual({ ok: false, message: 'Esa Recompensa ya no existe.' });
        expect(mockRefresh).toHaveBeenCalled();
    });
});

describe('deleteStreakRewardAction', () => {
    it('passes the id to the controller and refreshes', async () => {
        mockControllers.IDeleteStreakRewardController.mockResolvedValue(undefined);

        await expect(deleteStreakRewardAction(7)).resolves.toEqual({ ok: true });
        expect(mockControllers.IDeleteStreakRewardController).toHaveBeenCalledWith({ id: 7 });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('answers the 404 and the failure with a message', async () => {
        mockControllers.IDeleteStreakRewardController.mockRejectedValue(new NotFoundError('Streak reward 7 not found'));
        await expect(deleteStreakRewardAction(7)).resolves.toEqual({ ok: false, message: 'Esa Recompensa ya no existe.' });

        mockControllers.IDeleteStreakRewardController.mockRejectedValue(new ApiRequestError('boom', { status: 500 }));
        await expect(deleteStreakRewardAction(7)).resolves.toEqual({ ok: false, message: 'No pudimos borrar la Recompensa. Intentá de nuevo.' });
    });
});
