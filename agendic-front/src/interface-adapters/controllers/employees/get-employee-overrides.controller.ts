import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { InputParseError } from '@/src/entities/errors/common';
import type { IGetEmployeeOverridesUseCase } from '@/src/application/use-cases/employees/get-employee-overrides.use-case';
import type { EmployeeOverride } from '@/src/entities/models/employee-override';

const inputSchema = z.object({
    employeeId: z.number(),
});

function presenter(overrides: EmployeeOverride[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getEmployeeOverrides Presenter', op: 'serialize' }, () =>
        overrides.map((override) => ({
            date: override.date,
            intervals: override.intervals.map((interval) => ({
                startTime: interval.startTime,
                endTime: interval.endTime,
            })),
            coveredByEmployeeId: override.coveredByEmployeeId,
        })),
    );
}

export type IGetEmployeeOverridesController = ReturnType<typeof getEmployeeOverridesController>;

export const getEmployeeOverridesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getEmployeeOverridesUseCase: IGetEmployeeOverridesUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getEmployeeOverrides Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            const overrides = await getEmployeeOverridesUseCase({ employeeId: data.employeeId });
            return presenter(overrides, instrumentationService);
        });
