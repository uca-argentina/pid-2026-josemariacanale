import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/list-out-of-office.use-case';
import type { OutOfOffice } from '@/src/entities/models/out-of-office';

function presenter(periods: OutOfOffice[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listMyOutOfOffice Presenter', op: 'serialize' }, () =>
        periods.map(({ id, startDate, endDate, reason, notes, showNotePublicly }) => ({
            id,
            startDate,
            endDate,
            reason,
            notes,
            showNotePublicly,
        })),
    );
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListMyOutOfOfficeController = ReturnType<typeof listMyOutOfOfficeController>;

/**
 * Los períodos Fuera de la oficina del Usuario con Sesión que no terminaron.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listMyOutOfOfficeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listOutOfOfficeUseCase: IListOutOfOfficeUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyOutOfOffice Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listOutOfOfficeUseCase(), instrumentationService);
        });
