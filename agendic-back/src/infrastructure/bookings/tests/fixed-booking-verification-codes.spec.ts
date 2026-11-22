import {
  FixedBookingVerificationCodes,
  readFixedBookingCode,
} from '../fixed-booking-verification-codes';

describe('readFixedBookingCode', () => {
  it('reads BOOKING_CODE_FIXED in upper case', () => {
    expect(readFixedBookingCode({ BOOKING_CODE_FIXED: ' aaaaaa ' })).toBe(
      'AAAAAA',
    );
  });

  it.each([{}, { BOOKING_CODE_FIXED: '' }, { BOOKING_CODE_FIXED: '  ' }])(
    'is null when BOOKING_CODE_FIXED is not set (%j)',
    (env) => {
      expect(readFixedBookingCode(env)).toBeNull();
    },
  );
});

describe('FixedBookingVerificationCodes', () => {
  const codes = new FixedBookingVerificationCodes('AAAAAA');

  it('requests the fixed code for any email, with no rate limit', () => {
    for (let i = 0; i < 10; i++) expect(codes.request()).toBe('AAAAAA');
  });

  it('verifies the fixed code for any email, ignoring case and spaces', () => {
    expect(codes.verify('ana@example.com', 'AAAAAA')).toBe(true);
    expect(codes.verify('otro@example.com', ' aaaaaa ')).toBe(true);
  });

  it('rejects any other code', () => {
    expect(codes.verify('ana@example.com', 'AAAAAB')).toBe(false);
  });
});
