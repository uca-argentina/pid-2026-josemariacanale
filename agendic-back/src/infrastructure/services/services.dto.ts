import { applyDecorators } from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ServiceCategory } from '../../domain/services/service';
import { IfPresent, IsName, IsText } from '../users/users.dto';

/** Seña: a whole percentage of the price, 0 to 100. */
const IsDepositPercent = () => applyDecorators(IsInt(), Min(0), Max(100));

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
}
