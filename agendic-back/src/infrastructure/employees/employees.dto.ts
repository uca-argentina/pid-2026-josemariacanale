import { IsName, IsNormalizedEmail } from '../users/users.dto';

export class CreateEmployeeDto {
  @IsName()
  name!: string;

  @IsNormalizedEmail()
  email!: string;
}

export class UpdateEmployeeDto {
  @IsName()
  name!: string;
}
