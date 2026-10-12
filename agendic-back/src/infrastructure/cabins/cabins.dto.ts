import { MaxLength } from 'class-validator';
import { MAX_CABIN_NAME_LENGTH } from '../../domain/cabins/cabin';
import { IsName } from '../users/users.dto';

/** Body of creating or renaming a Cabina; the name is stored trimmed. */
export class CabinNameDto {
  @IsName()
  @MaxLength(MAX_CABIN_NAME_LENGTH)
  name!: string;
}
