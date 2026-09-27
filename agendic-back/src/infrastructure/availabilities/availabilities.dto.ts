import { Type } from 'class-transformer';
import { IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';
import { IsTimeOfDay } from '../branches/branches.dto';
import { IfPresent, IsName } from '../users/users.dto';

class AvailabilityIntervalDto {
  /** 0 = Sunday … 6 = Saturday, same as Date.getUTCDay(). */
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsTimeOfDay()
  startTime!: string;

  @IsTimeOfDay()
  endTime!: string;
}

export class CreateAvailabilityDto {
  @IsName()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityIntervalDto)
  intervals!: AvailabilityIntervalDto[];
}

/** `intervals`, when present, is the whole new set of Franjas. */
export class UpdateAvailabilityDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityIntervalDto)
  intervals?: AvailabilityIntervalDto[];
}
