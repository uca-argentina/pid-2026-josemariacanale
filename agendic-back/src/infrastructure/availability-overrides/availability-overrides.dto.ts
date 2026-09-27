import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { IsTimeOfDay } from '../branches/branches.dto';
import { IfPresent } from '../users/users.dto';

class OverrideIntervalDto {
  @IsTimeOfDay()
  startTime!: string;

  @IsTimeOfDay()
  endTime!: string;
}

/** `intervals: []` is a día libre. */
export class ReplaceOverridesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideIntervalDto)
  intervals!: OverrideIntervalDto[];

  /** The Empleado covering this date's Servicios, if anyone. */
  @IfPresent()
  @IsInt()
  coveredByEmployeeId?: number;
}
