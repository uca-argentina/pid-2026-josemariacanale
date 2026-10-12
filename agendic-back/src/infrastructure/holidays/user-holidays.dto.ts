import { IsBoolean, IsString, ValidateIf } from 'class-validator';

/** Body of `PUT /users/me/holidays`: a code, or `null` to drop the country. */
export class SetHolidayCountryDto {
  @ValidateIf((dto: SetHolidayCountryDto) => dto.countryCode !== null)
  @IsString()
  countryCode!: string | null;
}

/** Body of `PATCH /users/me/holidays/:holidayId`. */
export class ToggleHolidayDto {
  @IsBoolean()
  enabled!: boolean;
}
