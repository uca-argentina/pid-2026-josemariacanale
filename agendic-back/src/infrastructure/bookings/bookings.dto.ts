import { IsDateString, IsInt, IsString, MaxLength } from 'class-validator';
import {
  IfPresent,
  IsName,
  IsNormalizedEmail,
  trimmed,
} from '../users/users.dto';

export class CreateBookingDto {
  @IsInt()
  serviceId!: number;

  @IsDateString()
  startsAt!: string;

  @IsName()
  clientName!: string;

  @IsNormalizedEmail()
  clientEmail!: string;

  /** Comentario del Turno: free text, only its length is checked. */
  @IfPresent()
  @trimmed()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** El Código de verificación pedido para clientEmail (ADR 0022). */
  @IsString()
  code!: string;
}

/** Body de `POST /bookings/code`: a quién mandarle el Código de verificación. */
export class RequestBookingCodeDto {
  @IsNormalizedEmail()
  email!: string;
}

/** Body de Reagendar: el nuevo horario de inicio del Turno. */
export class RescheduleBookingDto {
  @IsDateString()
  startsAt!: string;
}

/** Body de `POST /client-access`: el Código de verificación a cambiar por un acceso a Mis turnos. */
export class ClientAccessDto {
  @IsNormalizedEmail()
  email!: string;

  @IsString()
  code!: string;
}
