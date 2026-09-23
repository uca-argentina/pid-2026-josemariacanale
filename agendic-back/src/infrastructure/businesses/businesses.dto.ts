import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsObject,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateBranchDto } from '../branches/branches.dto';
import { ServiceFieldsDto } from '../services/services.dto';
import { IfPresent, IsName, IsText, trimmed } from '../users/users.dto';

/** The Enlace de reserva's address: lowercased on the way in, then words of letters and digits joined by hyphens. */
const IsSlug = () =>
  applyDecorators(
    trimmed((value) => value.toLowerCase()),
    IsString(),
    Length(3, 40),
    Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  );

class BusinessFieldsDto {
  @IsName()
  name!: string;

  @IsText()
  description!: string;

  @IsSlug()
  slug!: string;
}

/** The three parts a Negocio is created with, each validated as its own endpoint validates it. */
export class CreateBusinessDto {
  @IsObject()
  @ValidateNested()
  @Type(() => BusinessFieldsDto)
  business!: BusinessFieldsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CreateBranchDto)
  branch!: CreateBranchDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ServiceFieldsDto)
  service!: ServiceFieldsDto;
}

export class UpdateBusinessDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  description?: string;

  @IfPresent()
  @IsSlug()
  slug?: string;
}
