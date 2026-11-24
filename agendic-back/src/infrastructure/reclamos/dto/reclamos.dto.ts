import { IsInt, IsPositive, IsString } from 'class-validator';
import { IsName, IsNormalizedEmail } from '../../users/users.dto';

export class CreateReclamoDto {
  @IsString()
  reason!: string;
}

export class UpdateReclamoDto {
  @IsString()
  response!: string;
}
