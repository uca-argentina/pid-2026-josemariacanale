import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError, InputParseError } from '@/src/entities/errors/common';
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
    async (input: Partial<z.infer<typeof inputSchema>>, sessionId: string | undefined) =>
        instrumentationService.startSpan({ name: 'deleteEmployeeOverride Controller' }, async () => {
            if (!sessionId) throw new UnauthenticatedError('Must be logged in to delete override');
            await authenticationService.validateSession(sessionId);
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await deleteEmployeeOverrideUseCase({
                employeeId: data.employeeId,
                date: data.date,
            });
            return presenter(instrumentationService);
        });
