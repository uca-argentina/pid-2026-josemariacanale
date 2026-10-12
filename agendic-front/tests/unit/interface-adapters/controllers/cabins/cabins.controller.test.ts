import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createCabinController } from '@/src/interface-adapters/controllers/cabins/create-cabin.controller';
import { listCabinsController } from '@/src/interface-adapters/controllers/cabins/list-cabins.controller';
import { renameCabinController } from '@/src/interface-adapters/controllers/cabins/rename-cabin.controller';
import { retireCabinController } from '@/src/interface-adapters/controllers/cabins/retire-cabin.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });
const cabin = { id: 3, branchId: 10, name: 'Box 1' };

describe('listCabinsController', () => {
    it('returns the presented Cabinas', async () => {
        const useCase = jest.fn().mockResolvedValue([{ ...cabin, deletedAt: null }]);

        await expect(listCabinsController(instrumentation, signedIn(), useCase)({ branchId: 10 })).resolves.toEqual([cabin]);
        expect(useCase).toHaveBeenCalledWith(10);
    });

    it.each([
        ['a missing branchId', {}],
        ['a string branchId', { branchId: '10' }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(listCabinsController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(listCabinsController(instrumentation, signedOut(), useCase)({ branchId: 10 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('createCabinController', () => {
    it('trims the name and returns the presented Cabina', async () => {
        const useCase = jest.fn().mockResolvedValue(cabin);

        await expect(createCabinController(instrumentation, signedIn(), useCase)({ branchId: 10, name: '  Box 1 ' })).resolves.toEqual(cabin);
        expect(useCase).toHaveBeenCalledWith({ branchId: 10, name: 'Box 1' });
    });

    it.each([
        ['an empty name', { branchId: 10, name: '   ' }],
        ['a name over 60 characters', { branchId: 10, name: 'a'.repeat(61) }],
        ['a missing branchId', { name: 'Box 1' }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(createCabinController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(createCabinController(instrumentation, signedOut(), useCase)({ branchId: 10, name: 'Box 1' })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('renameCabinController', () => {
    it('returns the presented Cabina', async () => {
        const useCase = jest.fn().mockResolvedValue(cabin);

        await expect(renameCabinController(instrumentation, signedIn(), useCase)({ id: 3, name: 'Box 1' })).resolves.toEqual(cabin);
        expect(useCase).toHaveBeenCalledWith({ id: 3, name: 'Box 1' });
    });

    it.each([
        ['an empty name', { id: 3, name: '' }],
        ['a name over 60 characters', { id: 3, name: 'a'.repeat(61) }],
        ['a missing id', { name: 'Box 1' }],
    ])('throws InputParseError for %s', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(renameCabinController(instrumentation, signedIn(), useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(renameCabinController(instrumentation, signedOut(), useCase)({ id: 3, name: 'Box 1' })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('retireCabinController', () => {
    it('retires the Cabina by id', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);

        await retireCabinController(instrumentation, signedIn(), useCase)({ id: 3 });
        expect(useCase).toHaveBeenCalledWith(3);
    });

    it('throws InputParseError for a missing id', async () => {
        const useCase = jest.fn();

        await expect(retireCabinController(instrumentation, signedIn(), useCase)({})).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();

        await expect(retireCabinController(instrumentation, signedOut(), useCase)({ id: 3 })).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
