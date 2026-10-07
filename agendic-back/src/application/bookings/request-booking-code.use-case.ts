import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from '../../domain/bookings/booking-verification-codes';
import { MAILER, Mailer } from '../../domain/mailer';

@Injectable()
export class RequestBookingCodeUseCase {
  constructor(
    @Inject(BOOKING_VERIFICATION_CODES)
    private readonly codes: BookingVerificationCodes,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * Pide un Código de verificación para Reservar, y lo manda por mail.
   *
   * @throws {TooManyRequestsError} ya se pidieron 5 códigos para ese email en los últimos 15 minutos
   */
  async execute(email: string): Promise<void> {
    const code = this.codes.request(email);
    await this.mailer.sendVerificationCode(email, code);
  }
}
