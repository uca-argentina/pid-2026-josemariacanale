import { IsArray, IsString } from 'class-validator';

/** Body of `PUT /users/me/calendar/calendars`: the ids of the calendars that count as Ocupado externo. */
export class SetCheckedCalendarsDto {
  @IsArray()
  @IsString({ each: true })
  checkedIds!: string[];
}
