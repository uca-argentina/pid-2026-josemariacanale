import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import type { UserBooking } from '@/src/entities/models/user-booking';

function presenter(bookings: UserBooking[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listMyBookings Presenter', op: 'serialize' }, () =>
        bookings.map((b) => ({
            id: b.id,
            status: b.status,
            startsAt: b.startsAt,
            endsAt: b.endsAt,
            clientName: b.clientName,
            clientEmail: b.clientEmail,
            noShowAt: b.noShowAt,
            serviceId: b.serviceId,
            employeeId: b.employeeId,
            serviceName: b.serviceName,
            business: b.business,
            branch: b.branch,
        })),
    );
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListMyBookingsController = ReturnType<typeof listMyBookingsController>;

/**
 * Los Turnos que atiende el Usuario logueado (ADR 0023): sus Servicios personales y los de sus Negocios.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listMyBookingsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listMyBookingsUseCase: IListMyBookingsUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyBookings Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listMyBookingsUseCase(), instrumentationService);
        });
