import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRedeemPrizeUseCase } from '@/src/application/use-cases/bookings/redeem-prize.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { RedeemedPrize } from '@/src/entities/models/booking-streak';
import { prizeText } from '@/src/interface-adapters/presenters/booking-streak.presenter';

function presenter(prize: RedeemedPrize, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'redeemPrize Presenter', op: 'serialize' }, () => ({ text: prizeText(prize) }));
}

const inputSchema = z.object({ bookingId: z.number().int().positive(), prizeId: z.number().int().positive() });

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IRedeemPrizeController = ReturnType<typeof redeemPrizeController>;

/**
 * Canjea un Premio en un Turno aceptado y devuelve lo que se entregó, en palabras ("10% de descuento").
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` o `prizeId` no son ids válidos
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno o el Premio no existen
 * @throws {PrizeAlreadyRedeemedError} el Premio ya se Canjeó
 * @throws {PrizeExpiredError} el Premio venció
 * @throws {PrizeOfAnotherClientError} el Premio es de otra Ficha del Cliente
 * @throws {BookingStateError} el Turno no está aceptado
 */
export const redeemPrizeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        redeemPrizeUseCase: IRedeemPrizeUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'redeemPrize Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await redeemPrizeUseCase(data.bookingId, data.prizeId), instrumentationService);
        });
