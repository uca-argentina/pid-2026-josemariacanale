import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export const trimmed = (
  normalize: (value: string) => string = (value) => value,
) =>
  Transform(({ value }) =>
    typeof value === 'string' ? normalize(value.trim()) : value,
  );

/** Trimmed, non-empty string. Named for its original use (a person's name); reuse as IsText for other free text. */
export const IsName = () =>
  applyDecorators(trimmed(), IsString(), IsNotEmpty());

export const IsText = IsName;

export const IsNormalizedEmail = () =>
  applyDecorators(
    trimmed((value) => value.toLowerCase()),
    IsEmail(),
  );

/** An Enlace de reserva tramo (Negocio's, Sucursal's, Usuario's or Servicio's): lowercased on the way in, then words of letters and digits joined by hyphens. */
export const IsSlug = () =>
  applyDecorators(
    trimmed((value) => value.toLowerCase()),
    IsString(),
    Length(3, 40),
    Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  );

/** Unlike @IsOptional, skips validation only when the field is absent, so null is rejected. */
export const IfPresent = () => ValidateIf((_, value) => value !== undefined);

export class UpdateMeDto {
  @IfPresent()
  @IsName()
  name?: string;

  /** Enlace de reserva del Usuario (ADR 0021). */
  @IfPresent()
  @IsSlug()
  slug?: string;

  /** Formato de hora del panel: 12 o 24 h. */
  @IfPresent()
  @IsIn([12, 24])
  timeFormat?: 12 | 24;

  /** Primer día de la semana, 0 = domingo. */
  @IfPresent()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStart?: number;
}
