import { ArrayUnique, IsArray, IsInt, IsOptional } from 'class-validator';
import { IsNormalizedEmail } from '../users/users.dto';

export class CreateEmployeeDto {
  @IsNormalizedEmail()
  email!: string;

  /** Sucursales where the invited person will work; optional only in a Negocio with a single Sucursal. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  branchIds?: number[];
}
