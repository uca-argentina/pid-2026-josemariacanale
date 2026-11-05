import { decryptRefreshToken, encryptRefreshToken } from './refresh-token-cipher';

const key = Buffer.alloc(32, 1);

describe('refresh token cipher', () => {
  it('gives back the token it encrypted', () => {
    const encrypted = encryptRefreshToken('1//refresh', key);

    expect(decryptRefreshToken(encrypted, key)).toBe('1//refresh');
  });

  it('does not keep the token in clear', () => {
    expect(encryptRefreshToken('1//refresh', key)).not.toContain('refresh');
  });

  it('encrypts the same token differently each time', () => {
    expect(encryptRefreshToken('t', key)).not.toBe(encryptRefreshToken('t', key));
  });

  it('refuses another key', () => {
    const encrypted = encryptRefreshToken('t', key);

    expect(() => decryptRefreshToken(encrypted, Buffer.alloc(32, 2))).toThrow();
  });

  it('refuses a tampered text', () => {
    const [iv, tag, text] = encryptRefreshToken('token', key).split('.');
    const flipped = Buffer.from(text, 'base64');
    flipped[0] ^= 1;

    expect(() =>
      decryptRefreshToken([iv, tag, flipped.toString('base64')].join('.'), key),
    ).toThrow();
  });
});
