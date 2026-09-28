import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { InputParseError } from '@/src/entities/errors/common';
import type { IPutEmployeeOverrideUseCase } from '@/src/application/use-cases/employees/put-employee-override.use-case';
import { employeeOverrideIntervalSchema } from '@/src/entities/models/employee-override';

const inputSchema = z.object({
    employeeId: z.number(),
    date: z.string(),
    override: z.object({
        intervals: z.array(employeeOverrideIntervalSchema),
        coveredByEmployeeId: z.number().optional(),
    }),
});

function presenter(instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'putEmployeeOverride Presenter', op: 'serialize' }, () => ({}));
}

export type IPutEmployeeOverrideController = ReturnType<typeof putEmployeeOverrideController>;

export const putEmployeeOverrideController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        putEmployeeOverrideUseCase: IPutEmployeeOverrideUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'putEmployeeOverride Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await putEmployeeOverrideUseCase({
                employeeId: data.employeeId,
                date: data.date,
                override: data.override,
            });
            return presenter(instrumentationService);
        });
