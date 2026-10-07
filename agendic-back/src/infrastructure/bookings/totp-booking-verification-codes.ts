import { createHmac } from 'node:crypto';
import { BookingVerificationCodes } from '../../domain/bookings/booking-verification-codes';
import { Clock } from '../../domain/clock';
import { TooManyRequestsError } from '../../domain/errors';

/** A-Z and 2-9, without 0/O or 1/I (ADR 0006): 32 characters, easy to read in an email. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * TOTP sin estado: el código de un email en un instante sale de un HMAC con el secreto del back, nada se guarda por
 * código pedido (ADR 0022). Solo el rate limit por email necesita estado, en memoria.
 *
 * ponytail: `requestsByEmail` vive en memoria de este proceso, así que con más de una instancia del back cada una
 * lleva su propio conteo, y una entrada queda para siempre por cada email que alguna vez pidió un código (nunca se
 * borra la clave, solo se filtran sus timestamps vencidos). Aceptable por ahora: cada entrada son unos pocos
 * timestamps. Pasar a un contador compartido con TTL (Redis) si el volumen de emails distintos importa.
 */
export class TotpBookingVerificationCodes implements BookingVerificationCodes {
  private readonly requestsByEmail = new Map<string, number[]>();

  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  /** @throws {TooManyRequestsError} ya se pidieron 5 códigos para ese email en los últimos 15 minutos */
  request(email: string): string {
    const key = normalize(email);
    const now = this.clock.now().getTime();
    const recent = (this.requestsByEmail.get(key) ?? []).filter(
      (requestedAt) => now - requestedAt < WINDOW_MS,
    );
    if (recent.length >= MAX_REQUESTS_PER_WINDOW)
      throw new TooManyRequestsError(
        `Too many verification codes requested for ${email}`,
      );
    recent.push(now);
    this.requestsByEmail.set(key, recent);
    return this.codeForStep(key, this.stepAt(now));
  }

  /** True si `code` es el de `email` en el paso vigente o el anterior (ADR 0022). */
  verify(email: string, code: string): boolean {
    const key = normalize(email);
    const step = this.stepAt(this.clock.now().getTime());
    // Also accepts the previous step, so a code requested near the end of a window still holds for the full 15 minutes.
    return code === this.codeForStep(key, step) || code === this.codeForStep(key, step - 1);
  }

  private stepAt(timeMs: number): number {
    return Math.floor(timeMs / WINDOW_MS);
  }

  private codeForStep(normalizedEmail: string, step: number): string {
    const digest = createHmac('sha256', this.secret)
      .update(`${normalizedEmail}:${step}`)
      .digest();
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[digest[i] % ALPHABET.length];
    return code;
  }
}

/** Throws naming the missing variable, so a misconfigured back fails at startup, not on the first code request. */
export function readBookingCodeSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = env.BOOKING_CODE_SECRET;
  if (!secret)
    throw new Error('Booking verification codes are not configured: missing BOOKING_CODE_SECRET');
  return secret;
}
