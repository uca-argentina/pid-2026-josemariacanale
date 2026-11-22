import { BookingVerificationCodes } from '../../domain/bookings/booking-verification-codes';

// With `BOOKING_CODE_FIXED` set, every email gets that code and it is always valid, with no rate limit: for working
// without a mail inbox. Unset, the real TOTP codes are used.
export function readFixedBookingCode(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.BOOKING_CODE_FIXED?.trim().toUpperCase() || null;
}

export class FixedBookingVerificationCodes implements BookingVerificationCodes {
  constructor(private readonly code: string) {}

  request(): string {
    return this.code;
  }

  verify(_email: string, code: string): boolean {
    return code.trim().toUpperCase() === this.code;
  }
}
