import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ClientAccess,
  ClientAccessTokens,
} from '../../domain/bookings/client-access-tokens';
import { Clock } from '../../domain/clock';

const WINDOW_MS = 15 * 60 * 1000;

/**
 * Token de Mis turnos sin estado (ADR 0022): payload `email:expiresAtMs` en base64url, firmado con un HMAC del
 * back. Nada se guarda; `verify` recalcula la firma y chequea el vencimiento, como el Código de verificación
 * (ver `TotpBookingVerificationCodes`).
 */
export class HmacClientAccessTokens implements ClientAccessTokens {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  sign(email: string): ClientAccess {
    const expiresAt = new Date(this.clock.now().getTime() + WINDOW_MS);
    const payload = `${email.trim().toLowerCase()}:${expiresAt.getTime()}`;
    const access = `${Buffer.from(payload).toString('base64url')}.${this.hmac(payload)}`;
    return { access, expiresAt };
  }

  verify(access: string): string | null {
    const dot = access.indexOf('.');
    if (dot < 0) return null;
    const encodedPayload = access.slice(0, dot);
    const signature = access.slice(dot + 1);
    let payload: string;
    try {
      payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    } catch {
      return null;
    }
    if (!this.matchesSignature(payload, signature)) return null;
    const colon = payload.lastIndexOf(':');
    if (colon < 0) return null;
    const email = payload.slice(0, colon);
    const expiresAtMs = Number(payload.slice(colon + 1));
    if (!email || !Number.isFinite(expiresAtMs)) return null;
    return expiresAtMs > this.clock.now().getTime() ? email : null;
  }

  private hmac(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  /** Same-length check before `timingSafeEqual`, which throws on a length mismatch. */
  private matchesSignature(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.hmac(payload));
    const actual = Buffer.from(signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}

/** Throws naming the missing variable, so a misconfigured back fails at startup, not on the first request. */
export function readClientAccessSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = env.CLIENT_ACCESS_SECRET;
  if (!secret)
    throw new Error('Client access tokens are not configured: missing CLIENT_ACCESS_SECRET');
  return secret;
}
