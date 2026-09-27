import { applyDecorators } from '@nestjs/common';
import { Matches, registerDecorator } from 'class-validator';
import { IfPresent, IsName, IsText } from '../users/users.dto';

export const IsTimeOfDay = () =>
  applyDecorators(
    Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'must be a HH:mm time' }),
  );

// CLDR's canonical list omits a few aliases (notably UTC) that resolvedOptions() still normalizes to
// themselves; special-cased rather than excluded, since it's a real, common IANA name.
const IANA_TIME_ZONES = new Set(Intl.supportedValuesOf('timeZone'));

/** Never a UTC offset (e.g. -03:00): Intl accepts those as a time zone too, but they don't know DST. */
const isIanaTimeZone = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  if (value === 'UTC') return true;
  try {
    return IANA_TIME_ZONES.has(
      new Intl.DateTimeFormat('en-US', {
        timeZone: value,
      }).resolvedOptions().timeZone,
    );
  } catch {
    return false;
  }
};

export const IsTimeZone = () => (object: object, propertyName: string) =>
  registerDecorator({
    name: 'isTimeZone',
    target: object.constructor,
    propertyName,
    validator: {
      validate: isIanaTimeZone,
      defaultMessage: () => 'must be a valid IANA time zone name',
    },
  });

export class CreateBranchDto {
  @IsName()
  name!: string;

  @IsText()
  address!: string;

  @IsTimeOfDay()
  opensAt!: string;

  @IsTimeOfDay()
  closesAt!: string;

  @IsTimeZone()
  timeZone!: string;
}

export class UpdateBranchDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  address?: string;

  @IfPresent()
  @IsTimeOfDay()
  opensAt?: string;

  @IfPresent()
  @IsTimeOfDay()
  closesAt?: string;

  @IfPresent()
  @IsTimeZone()
  timeZone?: string;
}
