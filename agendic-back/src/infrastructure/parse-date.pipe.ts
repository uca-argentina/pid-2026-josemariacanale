import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** A path or query param shaped like YYYY-MM-DD; anything else is a 400. */
@Injectable()
export class ParseDatePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException('date must be YYYY-MM-DD');
    return value;
  }
}
