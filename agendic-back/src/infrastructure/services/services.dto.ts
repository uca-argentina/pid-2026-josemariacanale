import { applyDecorators } from '@nestjs/common';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';
import { PREP_MINUTES, ServiceCategory } from '../../domain/services/service';
import { IfPresent, IsName, IsSlug, IsText } from '../users/users.dto';

/** Seña: a whole percentage of the price, 0 to 100. */
const IsDepositPercent = () => applyDecorators(IsInt(), Min(0), Max(100));

/** Tiempo de preparación: only the minutes in PREP_MINUTES. */
const IsPrepMinutes = () => IsIn(PREP_MINUTES);

/** Límite diario: a whole number of Turnos, at least one. */
const IsDailyLimit = () => applyDecorators(IsInt(), Min(1));

/** Intervalo: whole minutes, at least one. */
const IsSlotInterval = () => applyDecorators(IsInt(), Min(1));

/** Anticipación mínima: whole minutes, zero or more. */
const IsMinimumNotice = () => applyDecorators(IsInt(), Min(0));

/**
 * Repetición: the two fields travel together. Both given (a number each, or `null` in both to drop it) or neither;
 * validated on repeatEveryWeeks, so it runs even when only the other one is sent.
 */
const IsRepetitionPair = () => (object: object, propertyName: string) =>
  registerDecorator({
    name: 'isRepetitionPair',
    target: object.constructor,
    propertyName,
    validator: {
      validate: (_: unknown, { object }: ValidationArguments) => {
        const { repeatEveryWeeks, repeatMaxBookings } = object as {
          repeatEveryWeeks?: number | null;
          repeatMaxBookings?: number | null;
        };
        const given = (value?: number | null) => value !== undefined;
        const set = (value?: number | null) => value != null;
        return (
          given(repeatEveryWeeks) === given(repeatMaxBookings) &&
          set(repeatEveryWeeks) === set(repeatMaxBookings)
        );
      },
      defaultMessage: () =>
        'Repetición needs both repeatEveryWeeks and repeatMaxBookings',
    },
  });

/** Repetición: a whole number within `min` and `max`; absent or `null` pass (the pair rule covers them). */
const IsRepetitionCount =
  (min: number, max: number, message: string) =>
  (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isRepetitionCount',
      target: object.constructor,
      propertyName,
      validator: {
        validate: (value: unknown) =>
          value == null ||
          (Number.isInteger(value) &&
            (value as number) >= min &&
            (value as number) <= max),
        defaultMessage: () => message,
      },
    });

/** Repetición: weeks between the Turnos of a Serie, one or more. */
const IsRepeatEveryWeeks = () => (object: object, propertyName: string) => {
  IsRepetitionPair()(object, propertyName);
  IsRepetitionCount(
    1,
    Number.MAX_SAFE_INTEGER,
    'repeatEveryWeeks must be at least 1',
  )(object, propertyName);
};

/** Repetición: most Turnos a Serie may have, 2 to 10. */
const IsRepeatMaxBookings = () =>
  IsRepetitionCount(2, 10, 'repeatMaxBookings must be between 2 and 10');

/** Cabinas a Servicio admits: whole ids, none repeated. */
const IsCabinIds = () =>
  applyDecorators(IsArray(), IsInt({ each: true }), ArrayUnique());

/** The Servicio's own fields, shared with the Servicio part of POST /businesses. */
export class ServiceFieldsDto {
  @IsName()
  name!: string;

  @IfPresent()
  @IsText()
  description?: string;

  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IfPresent()
  @IsDepositPercent()
  depositPercent?: number;

  @IfPresent()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsSlug()
  slug!: string;

  @IfPresent()
  @IsBoolean()
  hidden?: boolean;

  @IfPresent()
  @IsPrepMinutes()
  prepMinutes?: number;

  @IfPresent()
  @IsDailyLimit()
  dailyLimit?: number;

  @IfPresent()
  @IsSlotInterval()
  slotInterval?: number;

  @IfPresent()
  @IsMinimumNotice()
  minimumNoticeMinutes?: number;

  @IsRepeatEveryWeeks()
  repeatEveryWeeks?: number | null;

  @IsRepeatMaxBookings()
  repeatMaxBookings?: number | null;
}

export class CreateServiceDto extends ServiceFieldsDto {
  @ArrayNotEmpty()
  @IsInt({ each: true })
  employeeIds!: number[];

  /** Cabinas of the Sucursal it admits; without it, none. */
  @IfPresent()
  @IsCabinIds()
  cabinIds?: number[];
}

/** A Servicio personal: the Servicio del Negocio's body without Sucursal or Empleados, with its Availability. */
export class CreatePersonalServiceDto extends ServiceFieldsDto {
  /** One of the Usuario's own. */
  @IsInt()
  availabilityId!: number;

  /** Rejected with 422: a Servicio personal has no Cabinas. Accepted here only so the rule answers instead of the whitelist. */
  @IfPresent()
  @IsCabinIds()
  cabinIds?: number[];
}

export class AssignEmployeeDto {
  @IsInt()
  employeeId!: number;

  /** One of that Empleado's own; without it, their default. */
  @IfPresent()
  @IsInt()
  availabilityId?: number;
}

export class ChangeEmployeeAvailabilityDto {
  /** One of that Empleado's own. */
  @IsInt()
  availabilityId!: number;
}

export class UpdateServiceDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  description?: string;

  @IfPresent()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IfPresent()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IfPresent()
  @IsNumber()
  @Min(0)
  price?: number;

  /** Null drops the Seña, so unlike the other fields it's @IsOptional rather than @IfPresent. */
  @IsOptional()
  @IsDepositPercent()
  depositPercent?: number | null;

  @IfPresent()
  @IsBoolean()
  requiresApproval?: boolean;

  @IfPresent()
  @IsSlug()
  slug?: string;

  @IfPresent()
  @IsBoolean()
  hidden?: boolean;

  @IfPresent()
  @IsPrepMinutes()
  prepMinutes?: number;

  /** Null drops the Límite diario, so like depositPercent it's @IsOptional rather than @IfPresent. */
  @IsOptional()
  @IsDailyLimit()
  dailyLimit?: number | null;

  /** Null drops the Intervalo, like dailyLimit. */
  @IsOptional()
  @IsSlotInterval()
  slotInterval?: number | null;

  @IfPresent()
  @IsMinimumNotice()
  minimumNoticeMinutes?: number;

  /** Both `null` drops the Repetición; they travel together. */
  @IsRepeatEveryWeeks()
  repeatEveryWeeks?: number | null;

  @IsRepeatMaxBookings()
  repeatMaxBookings?: number | null;

  /** Servicio personal only: one of the Usuario's own. */
  @IfPresent()
  @IsInt()
  availabilityId?: number;

  /** Servicio del Negocio only: replaces the whole set; `[]` empties it. */
  @IfPresent()
  @IsCabinIds()
  cabinIds?: number[];
}
