import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availability/list-availabilities.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { Availability } from '@/src/entities/models/availability';
import { z } from 'zod';

const inputSchema = z.object({ employeeId: z.number() });

function presenter(availabilities: Availability[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listAvailabilities Presenter', op: 'serialize' }, () =>
        availabilities.map((a) => ({
            id: a.id,
            name: a.name,
            isDefault: a.isDefault,
            days: a.days,
            overrides: a.overrides,
        }))
    );
}

export type IListAvailabilitiesController = ReturnType<typeof listAvailabilitiesController>;
export const listAvailabilitiesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listAvailabilitiesUseCase: IListAvailabilitiesUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listAvailabilities Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await listAvailabilitiesUseCase(data.employeeId), instrumentationService);
        });
