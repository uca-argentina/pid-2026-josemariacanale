import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CalendarOauthState } from '../../domain/calendar/calendar-oauth-state';
import { readCalendarOauthConfig } from './calendar-oauth-config';

/** El `state` vive lo que tarda el Usuario en dar el permiso en Google. */
const STATE_TTL_MS = 10 * 60 * 1000;

/** `state` firmado con HMAC-SHA256: `<payload>.<firma>`, con el payload `{ userId, expiresAt }` en base64url. */
@Injectable()
export class HmacCalendarOauthState implements CalendarOauthState {
  /** @throws {NotConfiguredError} faltan las variables de {@link readCalendarOauthConfig} */
  sign(userId: number, now: Date): string {
    const payload = Buffer.from(
      JSON.stringify({ userId, expiresAt: now.getTime() + STATE_TTL_MS }),
    ).toString('base64url');
    return `${payload}.${this.signature(payload)}`;
  }

  verify(state: string, now: Date): number | null {
    const [payload, signature, ...rest] = state.split('.');
    if (!payload || !signature || rest.length > 0) return null;
    const expected = Buffer.from(this.signature(payload));
    const received = Buffer.from(signature);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      return null;
    try {
      const { userId, expiresAt } = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as { userId: unknown; expiresAt: unknown };
      if (!Number.isInteger(userId) || typeof expiresAt !== 'number')
        return null;
      return expiresAt > now.getTime() ? (userId as number) : null;
    } catch {
      return null;
    }
  }

  private signature(payload: string) {
    return createHmac('sha256', readCalendarOauthConfig().stateKey)
      .update(payload)
      .digest('base64url');
  }
}
