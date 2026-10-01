import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IChangeEmployeeAvailabilityUseCase } from '@/src/application/use-cases/services/change-employee-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { serviceEmployeeAvailabilitySchema, type CatalogService } from '@/src/entities/models/service';

/** Only the Servicio's name, for the confirmation: the page reloads the detail afterwards. */
function presenter(service: CatalogService, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'changeEmployeeAvailability Presenter', op: 'serialize' }, () => ({
        name: service.name,
    }));
}

export type IChangeEmployeeAvailabilityController = ReturnType<typeof changeEmployeeAvailabilityController>;
/**
 * The select of the Horas laborables tab of the detail: the Usuario's own Empleado switches the Availability they
 * attend the Servicio with.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the Servicio, the Empleado or the Availability is not an id
 * @throws {AvailabilityNotOfEmployeeError} the Availability belongs to another Empleado
 * @throws {NotFoundError} the Empleado does not attend the Servicio
 * @throws {ApiRequestError} not allowed, or the back failed
 */
export const changeEmployeeAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        changeEmployeeAvailabilityUseCase: IChangeEmployeeAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'changeEmployeeAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = serviceEmployeeAvailabilitySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await changeEmployeeAvailabilityUseCase(data), instrumentationService);
        });
