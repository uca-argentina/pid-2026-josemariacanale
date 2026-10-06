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
}

export class VerifyBookingDto {
  @IsString()
  token!: string;
}

/** Body de Reagendar: el nuevo horario de inicio del Turno. */
export class RescheduleBookingDto {
  @IsDateString()
  startsAt!: string;
}
