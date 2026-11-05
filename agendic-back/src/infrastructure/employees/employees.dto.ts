import { ArrayUnique, IsArray, IsInt, IsOptional } from 'class-validator';
import { IsNormalizedEmail } from '../users/users.dto';

/** Body of the preview: the Sucursales the Empleado would work in. Emptiness is the use case's 400, after the 403 and 404. */
export class EmployeeBranchesDto {
  @IsArray()
  @IsInt({ each: true })
  branchIds!: number[];
}

/** Body of PUT: the Sucursales, plus the Turnos the Dueño confirmed to cancel after seeing the vista previa. */
export class ConfirmedEmployeeBranchesDto extends EmployeeBranchesDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  cancelBookingIds?: number[];
}

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
