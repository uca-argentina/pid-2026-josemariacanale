import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRetireEmployeeUseCase } from '@/src/application/use-cases/employees/retire-employee.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ employeeId: z.number() });

export type IRetireEmployeeController = ReturnType<typeof retireEmployeeController>;
// Dar de baja: nothing to present, the Empleado is gone from the list.
export const retireEmployeeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        retireEmployeeUseCase: IRetireEmployeeUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'retireEmployee Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await retireEmployeeUseCase(data.employeeId);
        });
