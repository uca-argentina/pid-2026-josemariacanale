import { IsNormalizedEmail } from '../users/users.dto';

export class CreateEmployeeDto {
  @IsNormalizedEmail()
  email!: string;
}
