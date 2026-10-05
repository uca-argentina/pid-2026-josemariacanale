import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { IsTimeOfDay } from '../branches/branches.dto';
import { IsName } from '../users/users.dto';

class TimeRangeDto {
  @IsTimeOfDay()
  start!: string;

  @IsTimeOfDay()
  end!: string;
}

class OverrideDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'must be YYYY-MM-DD' })
  date!: string;

  /** `[]` is a día libre. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  ranges!: TimeRangeDto[];
}

export class CreateAvailabilityDto {
  @IsName()
  name!: string;

  /** Checked as IANA by the use case, so a bad one answers 422. */
  @IsString()
  timeZone!: string;
}

/** The whole Availability, as GET answers it: it is replaced, not patched. */
export class UpdateAvailabilityDto extends CreateAvailabilityDto {
  /** Accepted so the front can send back what it read; the default is changed with PATCH. */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** `schedule[0]` is Sunday. */
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @IsArray({ each: true })
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  schedule!: TimeRangeDto[][];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideDto)
  overrides!: OverrideDto[];
}
