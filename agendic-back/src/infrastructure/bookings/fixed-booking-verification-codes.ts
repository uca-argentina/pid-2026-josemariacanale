import { BookingVerificationCodes } from '../../domain/bookings/booking-verification-codes';

export const FIXED_BOOKING_CODE = 'AAAAAA';

// The Código de verificación is disabled for now: every email gets the same code, with no rate limit.
// To turn it back on, wire TotpBookingVerificationCodes again in InfrastructureModule.
export class FixedBookingVerificationCodes implements BookingVerificationCodes {
  request(): string {
    return FIXED_BOOKING_CODE;
  }

  verify(_email: string, code: string): boolean {
    return code.trim().toUpperCase() === FIXED_BOOKING_CODE;
  }
}
