import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetAvailabilityUseCase } from '@/src/application/use-cases/availabilities/get-availability.use-case';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Availability, AvailabilityDetail } from '@/src/entities/models/availability';

const inputSchema = z.object({ availabilityId: z.number().int().positive().optional() });

function presenter(
    availabilities: Availability[],
    openAvailability: AvailabilityDetail | null,
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'listMyAvailabilities Presenter', op: 'serialize' }, () => ({
        availabilities: availabilities.map(({ id, name, isDefault, timeZone }) => ({ id, name, isDefault, timeZone })),
        open: openAvailability && {
            id: openAvailability.id,
            name: openAvailability.name,
            isDefault: openAvailability.isDefault,
            timeZone: openAvailability.timeZone,
            schedule: openAvailability.schedule.map((day) => day.map(({ start, end }) => ({ start, end }))),
            overrides: openAvailability.overrides.map((o) => ({
                date: o.date,
                ranges: o.ranges.map(({ start, end }) => ({ start, end })),
            })),
        },
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListMyAvailabilitiesController = ReturnType<typeof listMyAvailabilitiesController>;

/**
 * Las Horas laborables del Usuario con Sesión y, si se pide una, esa con sus Franjas y Anulaciones.
 *
 * Una `availabilityId` que no está entre las del Usuario se ignora: `open` queda en `null`.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `availabilityId` no es válido
 */
export const listMyAvailabilitiesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listAvailabilitiesUseCase: IListAvailabilitiesUseCase,
        getAvailabilityUseCase: IGetAvailabilityUseCase,
    ) =>
    async (input: unknown = {}): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyAvailabilities Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Availability id', { cause: error });

            const availabilities = await listAvailabilitiesUseCase();
            const { availabilityId } = data;
            const openAvailability =
                availabilityId !== undefined && availabilities.some((a) => a.id === availabilityId)
                    ? await getAvailabilityUseCase(availabilityId)
                    : null;
            return presenter(availabilities, openAvailability, instrumentationService);
        });
