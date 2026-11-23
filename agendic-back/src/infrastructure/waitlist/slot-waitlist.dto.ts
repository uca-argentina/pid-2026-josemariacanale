import {
  IsDateString,
  IsInt,
  IsISO8601,
  IsString,
  Matches,
} from 'class-validator';
import { IfPresent, IsName, IsNormalizedEmail } from '../users/users.dto';

export class JoinSlotWaitlistDto {
  @IsDateString()
  startsAt!: string;

  @IfPresent()
  @IsInt()
  employeeId?: number;

  @IsName()
  clientName!: string;

  @IsNormalizedEmail()
  clientEmail!: string;

  @IsString()
  code!: string;
}
