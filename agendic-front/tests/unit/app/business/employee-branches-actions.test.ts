import { changeEmployeeBranchesAction, previewEmployeeBranchesAction } from '@/app/(app)/business/[businessId]/employees/actions';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import {
    BranchesRequiredError,
    BranchNotOfBusinessError,
    EmployeeBranchesBookingsChangedError,
    LastEmployeeError,
    OwnerWorksAtEveryBranchError,
} from '@/src/entities/errors/employee';

const mockControllers: Record<string, jest.Mock> = {
    IPreviewEmployeeBranchesController: jest.fn(),
    IChangeEmployeeBranchesController: jest.fn(),
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

const booking = {
    id: 40,
    startsAt: '2026-11-10T13:00:00.000Z',
    endsAt: '2026-11-10T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    branch: { id: 2, name: 'Palermo' },
};

beforeEach(() => jest.clearAllMocks());

describe('previewEmployeeBranchesAction', () => {
    it('returns the Turnos that would be cancelled, without refreshing', async () => {
        mockControllers.IPreviewEmployeeBranchesController.mockResolvedValue([booking]);

        await expect(previewEmployeeBranchesAction(3, [1])).resolves.toEqual({ ok: true, bookings: [booking] });
        expect(mockControllers.IPreviewEmployeeBranchesController).toHaveBeenCalledWith({ employeeId: 3, branchIds: [1] });
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it.each([
        ['the last Empleado of a Servicio', new LastEmployeeError('Employee 3 is the last Employee of Service 8'), 'Es el último Empleado de un Servicio de esa Sucursal.'],
        ['the Dueño', new OwnerWorksAtEveryBranchError('The Dueño works at every Branch'), 'El Dueño trabaja en todas las Sucursales.'],
        ['no Sucursales', new BranchesRequiredError('branchIds must have at least one Branch'), 'Elegí al menos una Sucursal.'],
        [
            'a Sucursal of another Negocio',
            new BranchNotOfBusinessError('Branch 9 is not a Branch of Business 1'),
            'Una de las Sucursales ya no es de tu Negocio. Recargá la página y elegí de nuevo.',
        ],
    ])('shows the error of %s in Spanish without reporting it', async (_case, error, message) => {
        mockControllers.IPreviewEmployeeBranchesController.mockRejectedValue(error);

        await expect(previewEmployeeBranchesAction(3, [1])).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('refreshes when the Empleado no longer exists', async () => {
        mockControllers.IPreviewEmployeeBranchesController.mockRejectedValue(new NotFoundError('Employee 3 not found'));

        await expect(previewEmployeeBranchesAction(3, [1])).resolves.toEqual({ ok: false, message: 'Este Empleado ya no está en tu Negocio. Actualizamos la lista.' });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('reports an unexpected error', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers.IPreviewEmployeeBranchesController.mockRejectedValue(error);

        await expect(previewEmployeeBranchesAction(3, [1])).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });

    it('sends an expired Sesión to Iniciar sesión', async () => {
        mockControllers.IPreviewEmployeeBranchesController.mockRejectedValue(new ApiRequestError('no', { status: 401 }));

        await expect(previewEmployeeBranchesAction(3, [1])).rejects.toThrow(/^REDIRECT/);
    });
});

describe('changeEmployeeBranchesAction', () => {
    it('saves with the confirmed Turnos, refreshes and says how many were cancelled', async () => {
        mockControllers.IChangeEmployeeBranchesController.mockResolvedValue({ cancelledBookings: 1 });

        await expect(changeEmployeeBranchesAction(3, [1], [40])).resolves.toEqual({ ok: true, cancelledBookings: 1 });
        expect(mockControllers.IChangeEmployeeBranchesController).toHaveBeenCalledWith({ employeeId: 3, branchIds: [1], cancelBookingIds: [40] });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('answers leftOutChanged on the 409 of Turnos, without refreshing or reporting', async () => {
        mockControllers.IChangeEmployeeBranchesController.mockRejectedValue(new EmployeeBranchesBookingsChangedError('Los Turnos que se cancelan cambiaron'));

        await expect(changeEmployeeBranchesAction(3, [1], [40])).resolves.toEqual({ ok: false, leftOutChanged: true });
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('shows the 422 of the Dueño in Spanish', async () => {
        mockControllers.IChangeEmployeeBranchesController.mockRejectedValue(new OwnerWorksAtEveryBranchError('The Dueño works at every Branch'));

        await expect(changeEmployeeBranchesAction(3, [1], [])).resolves.toEqual({ ok: false, message: 'El Dueño trabaja en todas las Sucursales.' });
    });

    it('asks to review the data on InputParseError', async () => {
        mockControllers.IChangeEmployeeBranchesController.mockRejectedValue(new InputParseError('bad'));

        await expect(changeEmployeeBranchesAction(3, [1], [])).resolves.toEqual({ ok: false, message: 'Revisá los datos e intentá de nuevo.' });
    });
});
