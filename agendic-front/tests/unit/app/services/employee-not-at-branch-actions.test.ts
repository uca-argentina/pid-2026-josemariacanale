import { assignEmployeeAction, createServiceAction } from '@/app/(app)/services/actions';
import { EmployeeNotAtBranchError } from '@/src/entities/errors/service';

const mockControllers: Record<string, jest.Mock> = {
    IAssignEmployeeController: jest.fn(),
    ICreateServiceController: jest.fn(),
};
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => mockControllers[key] ?? { report: mockReport },
}));
jest.mock('next/cache', () => ({ refresh: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn(), unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

const notAtBranch = new EmployeeNotAtBranchError('Employee 4 does not work at Branch 2');

it('Ofrecer shows the 422 of an Empleado outside the Sucursal as an aviso, without reporting it', async () => {
    mockControllers.IAssignEmployeeController.mockRejectedValue(notAtBranch);

    await expect(assignEmployeeAction({ serviceId: 1, employeeId: 4 })).resolves.toEqual({
        ok: false,
        message: 'Ese Empleado no trabaja en la Sucursal de este Servicio.',
    });
    expect(mockReport).not.toHaveBeenCalled();
});

it('creating a Servicio shows the 422 of an Empleado outside the Sucursal as an aviso, without reporting it', async () => {
    mockControllers.ICreateServiceController.mockRejectedValue(notAtBranch);

    await expect(createServiceAction({})).resolves.toEqual({
        ok: false,
        message: 'Uno de los Empleados elegidos no trabaja en esta Sucursal.',
    });
    expect(mockReport).not.toHaveBeenCalled();
});
