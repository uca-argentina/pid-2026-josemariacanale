import { IsInt, IsPositive, IsString } from 'class-validator';
import { IsName, IsNormalizedEmail } from '../../users/users.dto';

export class CreateReclamoDto {
  @IsString()
  link!: string;

  @IsNormalizedEmail()
  clientEmail!: string;

  @IsName()
  clientName!: string;

  @IsString()
  reason!: string;
}
