import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { OutOfOfficeReason } from '../../domain/out-of-office/out-of-office';

/** A real calendar date shaped YYYY-MM-DD: the regex rules out times, the strict ISO check rules out 2026-02-31. */
const IsCalendarDate = () => (target: object, key: string) => {
  Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'must be YYYY-MM-DD' })(
    target,
    key,
  );
  IsISO8601({ strict: true })(target, key);
};

/** Body of POST and PUT: the período is replaced, not patched. */
export class OutOfOfficeDto {
  @IsCalendarDate()
  startDate!: string;

  @IsCalendarDate()
  endDate!: string;

  @IsEnum(OutOfOfficeReason)
  reason!: OutOfOfficeReason;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  showNotePublicly?: boolean;
}

/** Body of POST: the período, plus the Turnos the Usuario confirmed to cancel after seeing the vista previa. */
export class CreateOutOfOfficeDto extends OutOfOfficeDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  cancelBookingIds?: number[];
}
