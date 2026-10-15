import { IsISO8601, IsString, Matches } from 'class-validator';
import { IsName, IsNormalizedEmail } from '../users/users.dto';

/** Body de `POST /services/:id/waitlist`: el día lleno y el Cliente que se anota, con su Código de verificación (ADR 0022). */
export class JoinWaitlistDto {
  /** A real calendar date: the regex rules out times, the strict ISO check rules out 2026-02-31. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  date!: string;

  /** Nombre con el que se anota el Cliente. */
  @IsName()
  clientName!: string;

  /** Email del Cliente, ya Verificado con `code`. */
  @IsNormalizedEmail()
  clientEmail!: string;

  /** El Código de verificación pedido para `clientEmail`. */
  @IsString()
  code!: string;
}
