import { listOverridesUseCase } from '@/src/application/use-cases/overrides/list-overrides.use-case';
import { removeOverrideUseCase } from '@/src/application/use-cases/overrides/remove-override.use-case';
import { setOverrideUseCase } from '@/src/application/use-cases/overrides/set-override.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { OverrideConflictError, OverrideRuleError } from '@/src/entities/errors/override';
import { instrumentation, overridesWith } from '@/tests/unit/stubs';

const override = { date: '2026-12-24', intervals: [], coveredByEmployeeId: 4 };
const input = { employeeId: 3, date: '2026-12-24', intervals: [], coveredByEmployeeId: 4 };

describe('listOverridesUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const listOverrides = jest.fn().mockResolvedValue([override]);
        await expect(listOverridesUseCase(instrumentation, overridesWith({ listOverrides }))(3)).resolves.toEqual([override]);
        expect(listOverrides).toHaveBeenCalledWith(3);
    });

    it('lets NotFoundError through', async () => {
        const listOverrides = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(listOverridesUseCase(instrumentation, overridesWith({ listOverrides }))(3)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('setOverrideUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const setOverride = jest.fn().mockResolvedValue(override);
        await expect(setOverrideUseCase(instrumentation, overridesWith({ setOverride }))(input)).resolves.toEqual(override);
        expect(setOverride).toHaveBeenCalledWith(input);
    });

    it.each([new OverrideRuleError('Servicios distintos'), new OverrideConflictError('Choca con un Turno')])(
        'lets %p through',
        async (error) => {
            const setOverride = jest.fn().mockRejectedValue(error);
            await expect(setOverrideUseCase(instrumentation, overridesWith({ setOverride }))(input)).rejects.toBe(error);
        },
    );
});

describe('removeOverrideUseCase', () => {
    it('delegates to the repository', async () => {
        const removeOverride = jest.fn().mockResolvedValue(undefined);
        await removeOverrideUseCase(instrumentation, overridesWith({ removeOverride }))(3, '2026-12-24');
        expect(removeOverride).toHaveBeenCalledWith(3, '2026-12-24');
    });

    it('lets NotFoundError through', async () => {
        const removeOverride = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(removeOverrideUseCase(instrumentation, overridesWith({ removeOverride }))(3, '2026-12-24')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });
});
