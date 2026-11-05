import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  MAX_BURN_AFTER_DAYS,
  MIN_BURN_AFTER_DAYS,
  StreakRewardType,
} from '../../domain/streaks/streak-program';
import { IfPresent } from '../users/users.dto';

/** The most `StreakReward.value`, a Decimal(10, 2), can hold. */
const MAX_REWARD_VALUE = 99_999_999.99;

/** Body of PUT `streak-program`. */
export class SaveStreakProgramDto {
  @IsBoolean()
  active!: boolean;

  /** Tiempo de quemada. */
  @IsInt()
  @Min(MIN_BURN_AFTER_DAYS)
  @Max(MAX_BURN_AFTER_DAYS)
  burnAfterDays!: number;
}

/** A Recompensa's fields that depend on its type or are optional; `null` takes them away. What each type asks for is `streakRewardTerms`'s. */
class StreakRewardOptionalFieldsDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Max(MAX_REWARD_VALUE)
  value?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  serviceId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  validForDays?: number | null;
}

/** Body of POST `streak-rewards`. */
export class CreateStreakRewardDto extends StreakRewardOptionalFieldsDto {
  @IsInt()
  @Min(1)
  requiredCount!: number;

  @IsBoolean()
  repeatable!: boolean;

  @IsEnum(StreakRewardType)
  type!: StreakRewardType;
}

/** Body of PATCH `streak-rewards/:id`: the same fields, partial. */
export class UpdateStreakRewardDto extends StreakRewardOptionalFieldsDto {
  @IfPresent()
  @IsInt()
  @Min(1)
  requiredCount?: number;

  @IfPresent()
  @IsBoolean()
  repeatable?: boolean;

  @IfPresent()
  @IsEnum(StreakRewardType)
  type?: StreakRewardType;
}

/** Body of PATCH `bookings/:id/redeem-prize`. */
export class RedeemStreakPrizeDto {
  @IsInt()
  prizeId!: number;
}
