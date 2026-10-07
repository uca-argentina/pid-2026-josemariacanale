import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from '../../domain/bookings/booking-verification-codes';
import {
  ClientAccess,
  CLIENT_ACCESS_TOKENS,
  ClientAccessTokens,
} from '../../domain/bookings/client-access-tokens';
import { InvalidCodeError } from '../../domain/errors';

/** Cambia un Código de verificación vigente por un acceso de 15 minutos a Mis turnos (ADR 0022). */
@Injectable()
export class RequestClientAccessUseCase {
  constructor(
    @Inject(BOOKING_VERIFICATION_CODES)
    private readonly codes: BookingVerificationCodes,
    @Inject(CLIENT_ACCESS_TOKENS)
    private readonly tokens: ClientAccessTokens,
  ) {}

  /** @throws {InvalidCodeError} el código no es válido para email en su ventana */
  execute(email: string, code: string): ClientAccess {
    if (!this.codes.verify(email, code))
      throw new InvalidCodeError(`Invalid or expired verification code for ${email}`);
    return this.tokens.sign(email);
  }
}
