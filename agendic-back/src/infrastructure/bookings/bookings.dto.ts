import { IsDateString, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
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

  /** Empleado elegido: the Empleado of the Enlace de reserva the Cliente came in by. */
  @IfPresent()
  @IsInt()
  employeeId?: number;

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

/** Body de Calificar: el puntaje de 1 a 5 y un comentario opcional. */
export class RateBookingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IfPresent()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

/** Body de Reagendar: el nuevo horario de inicio del Turno. */
export class RescheduleBookingDto {
  @IsDateString()
  startsAt!: string;
}

/** The Motivo de cancelación of a body, trimmed; a blank one is none. */
export const reasonOf = ({ reason }: CancelBookingDto): string | null =>
  reason?.trim() || null;

/** Body opcional de Cancelar y Rechazar turno: el Motivo de cancelación. */
export class CancelBookingDto {
  @IfPresent()
  @IsString()
  @MaxLength(500, { message: 'reason is too long' })
  reason?: string;
}
