import { Clock } from '../../../domain/clock';
import { TooManyRequestsError } from '../../../domain/errors';
import { TotpBookingVerificationCodes } from '../totp-booking-verification-codes';

class FakeClock implements Clock {
  constructor(private current: Date) {}
  now() {
    return this.current;
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

describe('TotpBookingVerificationCodes', () => {
  it('verifies a code it just requested', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const codes = new TotpBookingVerificationCodes('secret', clock);
    const code = codes.request('client@example.com');
    expect(codes.verify('client@example.com', code)).toBe(true);
  });

  it('rejects a wrong code', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const codes = new TotpBookingVerificationCodes('secret', clock);
    codes.request('client@example.com');
    expect(codes.verify('client@example.com', 'WRONG1')).toBe(false);
  });

  it('rejects a code requested for another email', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const codes = new TotpBookingVerificationCodes('secret', clock);
    const code = codes.request('client@example.com');
    expect(codes.verify('other@example.com', code)).toBe(false);
  });

  it('keeps a code valid for its 15-minute window', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const codes = new TotpBookingVerificationCodes('secret', clock);
    const code = codes.request('client@example.com');
    clock.advance(14 * 60 * 1000);
    expect(codes.verify('client@example.com', code)).toBe(true);
  });

  it('rejects a code once its window and the previous one have both passed', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const codes = new TotpBookingVerificationCodes('secret', clock);
    const code = codes.request('client@example.com');
    clock.advance(31 * 60 * 1000);
    expect(codes.verify('client@example.com', code)).toBe(false);
  });

  it('throws after 5 requests for the same email within 15 minutes', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const codes = new TotpBookingVerificationCodes('secret', clock);
    for (let i = 0; i < 5; i++) codes.request('client@example.com');
    expect(() => codes.request('client@example.com')).toThrow(TooManyRequestsError);
  });

  it('allows a 6th request once the oldest one falls out of the window', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const codes = new TotpBookingVerificationCodes('secret', clock);
    for (let i = 0; i < 5; i++) codes.request('client@example.com');
    clock.advance(15 * 60 * 1000 + 1);
    expect(() => codes.request('client@example.com')).not.toThrow();
  });
});
