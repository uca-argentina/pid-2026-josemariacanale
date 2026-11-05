import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsObject,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
  registerDecorator,
} from 'class-validator';
import { IfPresent, IsName, IsSlug, IsText } from '../users/users.dto';
import { isIanaTimeZone } from '../../domain/time-zone';

export const IsTimeOfDay = () =>
  applyDecorators(
    Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'must be a HH:mm time' }),
  );

/** Free text that may be absent or `null`; blank is stored as `null`. */
const IsNullableText = () =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim() || null : value,
    ),
    ValidateIf((_, value) => value != null),
    IsString(),
  );

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

/** A number of degrees from `-limit` to `limit`; anything else, a string or `null` included, gets one message. */
const IsDegrees = (limit: number) => (object: object, propertyName: string) =>
  registerDecorator({
    name: 'isDegrees',
    target: object.constructor,
    propertyName,
    validator: {
      validate: (value: unknown) =>
        typeof value === 'number' && Math.abs(value) <= limit,
      defaultMessage: () => `$property must be between -${limit} and ${limit}`,
    },
  });

/** The point of a Sucursal's Ubicación (ADR 0037). */
export class LocationDto {
  @IsDegrees(90)
  lat!: number;

  @IsDegrees(180)
  lng!: number;
}

/**
 * A Ubicación's point, validated field by field (`location.lat …`). Not an object is `notObjectMessage`; `null`
 * falls there too, so an endpoint that accepts it absent decides what `null` means.
 */
const IsLocation = (notObjectMessage = '$property is required') =>
  applyDecorators(
    IsObject({ message: notObjectMessage }),
    ValidateNested(),
    Type(() => LocationDto),
  );

export class BranchFieldsDto {
  @IsName()
  name!: string;

  @IsText()
  address!: string;

  @IsTimeZone()
  timeZone!: string;

  @IsNullableText()
  description?: string | null;

  @IsLocation()
  location!: LocationDto;
}

export class CreateBranchDto extends BranchFieldsDto {
  @IsSlug()
  slug!: string;
}

export class UpdateBranchDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  address?: string;

  @IfPresent()
  @IsTimeZone()
  timeZone?: string;

  @IfPresent()
  @IsSlug()
  slug?: string;

  @IsNullableText()
  description?: string | null;

  /** Can be changed, never removed: `null` is a 400. */
  @IfPresent()
  @IsLocation('$property cannot be removed')
  location?: LocationDto;
}
