import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IAddEmployeeUseCase } from '@/src/application/use-cases/employees/add-employee.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createEmployeeSchema, type Invitation } from '@/src/entities/models/employee';

function presenter(invitation: Invitation, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'addEmployee Presenter', op: 'serialize' }, () => ({
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
    }));
}

const inputSchema = createEmployeeSchema.extend({ email: z.email() });

export type IAddEmployeeController = ReturnType<typeof addEmployeeController>;
export const addEmployeeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        addEmployeeUseCase: IAddEmployeeUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'addEmployee Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await addEmployeeUseCase(data), instrumentationService);
        });
