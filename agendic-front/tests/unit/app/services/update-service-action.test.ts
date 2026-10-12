import { updateServiceAction } from '@/app/(app)/services/actions';
import { CabinNotOfBranchError } from '@/src/entities/errors/cabin';

const mockUpdate = jest.fn();
const mockReport = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IUpdateServiceController' ? mockUpdate : { report: mockReport }),
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

describe('updateServiceAction with cabinIds', () => {
    it('passes the cabinIds to the controller and refreshes', async () => {
        mockUpdate.mockResolvedValue({ id: 100, name: 'Masaje', slug: 'masaje', hidden: false });

        await expect(updateServiceAction({ id: 100, cabinIds: [3, 4] })).resolves.toMatchObject({ ok: true });
        expect(mockUpdate).toHaveBeenCalledWith({ id: 100, cabinIds: [3, 4] });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('shows the 422 as a notice and refreshes so the page asks for the Cabinas again', async () => {
        mockUpdate.mockRejectedValue(new CabinNotOfBranchError('Cabin 3 is not an active Cabin of Branch 10'));

        await expect(updateServiceAction({ id: 100, cabinIds: [3] })).resolves.toEqual({
            ok: false,
            message: 'Una de las Cabinas ya no existe en la Sucursal. Revisá la lista y guardá de nuevo.',
        });
        expect(mockRefresh).toHaveBeenCalled();
        expect(mockReport).not.toHaveBeenCalled();
    });
});
