import { applyDecorators } from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PREP_MINUTES, ServiceCategory } from '../../domain/services/service';
import { IfPresent, IsName, IsSlug, IsText } from '../users/users.dto';

/** Seña: a whole percentage of the price, 0 to 100. */
const IsDepositPercent = () => applyDecorators(IsInt(), Min(0), Max(100));

/** Tiempo de preparación: only the minutes in PREP_MINUTES. */
const IsPrepMinutes = () => IsIn(PREP_MINUTES);

/** Límite diario: a whole number of Turnos, at least one. */
const IsDailyLimit = () => applyDecorators(IsInt(), Min(1));

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
}

export class CreateServiceDto extends ServiceFieldsDto {
  @ArrayNotEmpty()
  @IsInt({ each: true })
  employeeIds!: number[];
}

export class AssignEmployeeDto {
  @IsInt()
  employeeId!: number;

  /** One of that Empleado's own; without it, their default. */
  @IfPresent()
  @IsInt()
  availabilityId?: number;
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
}
