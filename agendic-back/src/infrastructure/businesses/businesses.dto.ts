import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { BranchFieldsDto } from '../branches/branches.dto';
import { ServiceFieldsDto } from '../services/services.dto';
import { IfPresent, IsName, IsSlug, IsText } from '../users/users.dto';

class BusinessFieldsDto {
  @IsName()
  name!: string;

  @IsText()
  description!: string;

  @IsSlug()
  slug!: string;
}

/** Its `slug` may be left out: the first Sucursal then takes the Negocio's. */
class FirstBranchDto extends BranchFieldsDto {
  @IfPresent()
  @IsSlug()
  slug?: string;
}

/** The three parts a Negocio is created with, each validated as its own endpoint validates it. */
export class CreateBusinessDto {
  @IsObject()
  @ValidateNested()
  @Type(() => BusinessFieldsDto)
  business!: BusinessFieldsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => FirstBranchDto)
  branch!: FirstBranchDto;

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
