import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './infrastructure/domain-exception.filter';
import { VALIDATION_OPTIONS } from './infrastructure/validation-options';

/** Shared by main.ts and the tests, so both run the same pipes and filters. */
export function setupApp<T extends INestApplication>(app: T): T {
  app.useGlobalPipes(new ValidationPipe(VALIDATION_OPTIONS));
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors();
  return app;
}
