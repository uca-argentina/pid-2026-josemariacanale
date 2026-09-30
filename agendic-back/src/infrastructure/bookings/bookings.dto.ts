import { IsDateString, IsInt, IsString } from 'class-validator';
import {
  IfPresent,
  IsName,
  IsNormalizedEmail,
  IsText,
} from '../users/users.dto';

export class CreateBookingDto {
  @IsInt()
  serviceId!: number;

  @IsInt()
  employeeId!: number;

  @IsDateString()
  startsAt!: string;

  @IsName()
  clientName!: string;

  @IsNormalizedEmail()
  clientEmail!: string;

  @IfPresent()
  @IsText()
  note?: string;
}

export class VerifyBookingDto {
  @IsString()
  token!: string;
}
