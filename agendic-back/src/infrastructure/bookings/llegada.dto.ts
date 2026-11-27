import { IsDateString } from 'class-validator';
export class LogearLlegadaDto {
  @IsDateString()
  llegada!: string;
}
