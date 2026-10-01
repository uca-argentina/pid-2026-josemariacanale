import { removeOverrideController } from '@/src/interface-adapters/controllers/overrides/remove-override.controller';
import { setOverridesController } from '@/src/interface-adapters/controllers/overrides/set-overrides.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { OverrideConflictError } from '@/src/entities/errors/override';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const signedOut = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
const hours = [{ startTime: '09:00', endTime: '12:00' }];

describe('setOverridesController', () => {
    it('runs the use case once per date, in order, with the same Franjas and Cobertura', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await setOverridesController(instrumentation, signedIn, useCase)({
            employeeId: 3,
            dates: ['2026-12-24', '2026-12-25'],
            intervals: hours,
            coveredByEmployeeId: 4,
        });
        expect(useCase.mock.calls).toEqual([
            [{ employeeId: 3, date: '2026-12-24', intervals: hours, coveredByEmployeeId: 4 }],
            [{ employeeId: 3, date: '2026-12-25', intervals: hours, coveredByEmployeeId: 4 }],
        ]);
    });

    it('sends an empty intervals array for a día libre without Cobertura', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await setOverridesController(instrumentation, signedIn, useCase)({ employeeId: 3, dates: ['2026-12-24'], intervals: [] });
        expect(useCase).toHaveBeenCalledWith({ employeeId: 3, date: '2026-12-24', intervals: [] });
    });

    it('stops at the first date that fails', async () => {
        const useCase = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new OverrideConflictError('choca'));
        await expect(
            setOverridesController(instrumentation, signedIn, useCase)({
                employeeId: 3,
                dates: ['2026-12-24', '2026-12-25', '2026-12-26'],
                intervals: [],
                coveredByEmployeeId: 4,
            }),
        ).rejects.toBeInstanceOf(OverrideConflictError);
        expect(useCase).toHaveBeenCalledTimes(2);
    });

    it.each([
        { dates: ['2026-12-24'], intervals: [] },
        { employeeId: 3, dates: [], intervals: [] },
        { employeeId: 3, dates: ['24/12/2026'], intervals: [] },
        { employeeId: 3, dates: ['2026-12-24'] },
        { employeeId: 3, dates: ['2026-12-24'], intervals: [{ startTime: '9', endTime: '12:00' }] },
        { employeeId: 3, dates: ['2026-12-24'], intervals: [], coveredByEmployeeId: 0 },
    ])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(setOverridesController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(
            setOverridesController(instrumentation, signedOut, useCase)({ employeeId: 3, dates: ['2026-12-24'], intervals: [] }),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('removeOverrideController', () => {
    it('runs the use case with the Empleado and the date', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await removeOverrideController(instrumentation, signedIn, useCase)({ employeeId: 3, date: '2026-12-24' });
        expect(useCase).toHaveBeenCalledWith(3, '2026-12-24');
    });

    it.each([{ date: '2026-12-24' }, { employeeId: 3 }, { employeeId: 3, date: 'mañana' }])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(removeOverrideController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(
            removeOverrideController(instrumentation, signedOut, useCase)({ employeeId: 3, date: '2026-12-24' }),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});