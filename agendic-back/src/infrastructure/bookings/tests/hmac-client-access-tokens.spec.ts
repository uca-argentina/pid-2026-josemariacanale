import { Clock } from '../../../domain/clock';
import { HmacClientAccessTokens } from '../hmac-client-access-tokens';

class FakeClock implements Clock {
  constructor(private current: Date) {}
  now() {
    return this.current;
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

describe('HmacClientAccessTokens', () => {
  it('verifies the email of a token it just signed', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const tokens = new HmacClientAccessTokens('secret', clock);
    const { access } = tokens.sign('Client@Example.com');
    expect(tokens.verify(access)).toBe('client@example.com');
  });

  it('expires at 15 minutes', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const tokens = new HmacClientAccessTokens('secret', clock);
    const { expiresAt } = tokens.sign('client@example.com');
    expect(expiresAt).toEqual(new Date('2026-01-01T00:15:00.000Z'));
  });

  it('keeps a token valid right up to its vencimiento', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const tokens = new HmacClientAccessTokens('secret', clock);
    const { access } = tokens.sign('client@example.com');
    clock.advance(15 * 60 * 1000 - 1);
    expect(tokens.verify(access)).toBe('client@example.com');
  });

  it('rejects a token once it vencio', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const tokens = new HmacClientAccessTokens('secret', clock);
    const { access } = tokens.sign('client@example.com');
    clock.advance(15 * 60 * 1000);
    expect(tokens.verify(access)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const { access } = new HmacClientAccessTokens('secret-a', clock).sign(
      'client@example.com',
    );
    expect(new HmacClientAccessTokens('secret-b', clock).verify(access)).toBeNull();
  });

  it.each(['', 'not-a-token', 'nodot', 'invalid-base64url!!.sig'])(
    'rejects a malformed token %p',
    (access) => {
      const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
      const tokens = new HmacClientAccessTokens('secret', clock);
      expect(tokens.verify(access)).toBeNull();
    },
  );
});
