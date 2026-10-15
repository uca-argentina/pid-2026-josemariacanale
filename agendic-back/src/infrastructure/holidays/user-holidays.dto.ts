import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

/** Body of `PUT /users/me/holidays`: a code, or `null` to drop the country. */
export class SetHolidayCountryDto {
  @ValidateIf((dto: SetHolidayCountryDto) => dto.countryCode !== null)
  @IsString()
  countryCode!: string | null;
}

/** Body of `PUT /users/me/holidays`: the country, plus the Turnos the Usuario confirmed to cancel after seeing the vista previa. */
export class ConfirmedHolidayCountryDto extends SetHolidayCountryDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  cancelBookingIds?: number[];
}

/** Body of `PATCH /users/me/holidays/:holidayId`. */
export class ToggleHolidayDto {
  @IsBoolean()
  enabled!: boolean;
}

/** Body of `PATCH /users/me/holidays/:holidayId`, plus the Turnos the Usuario confirmed to cancel after seeing the vista previa. */
export class ConfirmedToggleHolidayDto extends ToggleHolidayDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  cancelBookingIds?: number[];
}
