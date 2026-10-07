import { readFrontendUrl } from './nodemailer-mailer';

describe('readFrontendUrl', () => {
  it('reads FRONTEND_URL from the environment', () => {
    expect(readFrontendUrl({ FRONTEND_URL: 'http://localhost:3000' })).toBe(
      'http://localhost:3000',
    );
  });

  it('drops a trailing slash, so the Enlace del Turno has no double slash', () => {
    expect(readFrontendUrl({ FRONTEND_URL: 'http://localhost:3000/' })).toBe(
      'http://localhost:3000',
    );
  });

  it('fails naming the variable when it is not set', () => {
    expect(() => readFrontendUrl({})).toThrow('FRONTEND_URL');
  });
});
