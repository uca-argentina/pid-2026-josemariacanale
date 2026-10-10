import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsString,
  Matches,
  ValidateIf,
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

/** Every field of a new Sucursal but its slug, which Crear Negocio lets default. */
export class BranchFieldsDto {
  @IsName()
  name!: string;

  @IsText()
  address!: string;

  @IsTimeZone()
  timeZone!: string;

  @IsNullableText()
  description?: string | null;
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
}
