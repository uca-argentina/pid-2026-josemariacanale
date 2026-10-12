import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDownloadBookingsCsvUseCase } from '@/src/application/use-cases/analytics/download-bookings-csv.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { bookingsCsvQuerySchema, type CsvFile } from '@/src/entities/models/analytics';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IDownloadBookingsCsvController = ReturnType<typeof downloadBookingsCsvController>;

/**
 * El CSV de Turnos del rango y los filtros de la página de analíticas, con el nombre `turnos-<from>-<to>.csv`.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango o un filtro no son válidos
 * @throws {UnauthorizedError} no es Empleado del Negocio, o filtra por Empleado sin ser el Dueño
 * @throws {NotFoundError} el Negocio, la Sucursal, el Servicio o el Empleado no existen
 */
export const downloadBookingsCsvController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        downloadBookingsCsvUseCase: IDownloadBookingsCsvUseCase,
    ) =>
    async (input: unknown): Promise<CsvFile> =>
        instrumentationService.startSpan({ name: 'downloadBookingsCsv Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = bookingsCsvQuerySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid bookings CSV query', { cause: error });
            return { filename: `turnos-${data.from}-${data.to}.csv`, content: await downloadBookingsCsvUseCase(data) };
        });
