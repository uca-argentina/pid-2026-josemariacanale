import { createCabinAction, renameCabinAction, retireCabinAction } from '@/app/(app)/business/branches/actions';
import { CabinHasUpcomingBookingsError, CabinNameTakenError, InvalidCabinNameError } from '@/src/entities/errors/cabin';
import { ApiRequestError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    ICreateCabinController: jest.fn(),
    IRenameCabinController: jest.fn(),
    IRetireCabinController: jest.fn(),
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

beforeEach(() => jest.clearAllMocks());

describe('createCabinAction', () => {
    it('passes the branchId and name to the controller and refreshes', async () => {
        mockControllers.ICreateCabinController.mockResolvedValue({ id: 3, branchId: 10, name: 'Box 1' });

        await expect(createCabinAction(10, 'Box 1')).resolves.toMatchObject({ ok: true });
        expect(mockControllers.ICreateCabinController).toHaveBeenCalledWith({ branchId: 10, name: 'Box 1' });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('puts the 409 under the name field', async () => {
        mockControllers.ICreateCabinController.mockRejectedValue(new CabinNameTakenError('Cabin name Box 1 already in use in Branch 10'));

        await expect(createCabinAction(10, 'Box 1')).resolves.toEqual({
            ok: false,
            field: 'name',
            message: 'Ya hay una Cabina con ese nombre en esta Sucursal.',
        });
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('puts the 400 under the name field', async () => {
        mockControllers.ICreateCabinController.mockRejectedValue(new InvalidCabinNameError('x'));

        await expect(createCabinAction(10, 'Box 1')).resolves.toMatchObject({ ok: false, field: 'name' });
    });
});

describe('renameCabinAction', () => {
    it('passes the id and name to the controller', async () => {
        mockControllers.IRenameCabinController.mockResolvedValue({ id: 3, branchId: 10, name: 'Box 2' });

        await expect(renameCabinAction(3, 'Box 2')).resolves.toMatchObject({ ok: true });
        expect(mockControllers.IRenameCabinController).toHaveBeenCalledWith({ id: 3, name: 'Box 2' });
    });

    it('puts the 409 under the name field', async () => {
        mockControllers.IRenameCabinController.mockRejectedValue(new CabinNameTakenError('x'));

        await expect(renameCabinAction(3, 'Box 2')).resolves.toMatchObject({ ok: false, field: 'name' });
    });
});

describe('retireCabinAction', () => {
    it('retires the Cabina and refreshes', async () => {
        mockControllers.IRetireCabinController.mockResolvedValue(undefined);

        await expect(retireCabinAction(3)).resolves.toEqual({ ok: true, data: undefined });
        expect(mockControllers.IRetireCabinController).toHaveBeenCalledWith({ id: 3 });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('tells the Dueño how many upcoming Turnos the Cabina has, without reporting it', async () => {
        mockControllers.IRetireCabinController.mockRejectedValue(new CabinHasUpcomingBookingsError('Cabin 3 has 2 upcoming Turnos', 2));

        await expect(retireCabinAction(3)).resolves.toEqual({
            ok: false,
            message: 'Esta Cabina tiene 2 Turnos próximos. Reagendalos o cancelalos antes de darla de baja.',
        });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('uses the singular for one upcoming Turno', async () => {
        mockControllers.IRetireCabinController.mockRejectedValue(new CabinHasUpcomingBookingsError('Cabin 3 has 1 upcoming Turnos', 1));

        await expect(retireCabinAction(3)).resolves.toEqual({
            ok: false,
            message: 'Esta Cabina tiene 1 Turno próximo. Reagendalo o cancelalo antes de darla de baja.',
        });
    });

    it('shows any other 409 as a generic notice without reporting it', async () => {
        mockControllers.IRetireCabinController.mockRejectedValue(new ApiRequestError('Conflict', { status: 409 }));

        await expect(retireCabinAction(3)).resolves.toEqual({ ok: false, message: 'No pudimos dar de baja la Cabina. Intentá de nuevo.' });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('reports any other failure', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers.IRetireCabinController.mockRejectedValue(error);

        await retireCabinAction(3);
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});
