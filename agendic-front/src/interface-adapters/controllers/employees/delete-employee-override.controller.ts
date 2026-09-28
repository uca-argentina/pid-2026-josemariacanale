import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { InputParseError } from '@/src/entities/errors/common';
import type { IDeleteEmployeeOverrideUseCase } from '@/src/application/use-cases/employees/delete-employee-override.use-case';

const inputSchema = z.object({
    employeeId: z.number(),
    date: z.string(),
});

function presenter(instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'deleteEmployeeOverride Presenter', op: 'serialize' }, () => ({}));
}

export type IDeleteEmployeeOverrideController = ReturnType<typeof deleteEmployeeOverrideController>;

export const deleteEmployeeOverrideController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        deleteEmployeeOverrideUseCase: IDeleteEmployeeOverrideUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'deleteEmployeeOverride Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await deleteEmployeeOverrideUseCase({
                employeeId: data.employeeId,
                date: data.date,
            });
            return presenter(instrumentationService);
        });
