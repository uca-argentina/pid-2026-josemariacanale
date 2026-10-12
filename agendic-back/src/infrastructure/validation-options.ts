import { ValidationPipeOptions } from '@nestjs/common';

/** How every request body is validated; also applied to JSON sent inside a multipart field. */
export const VALIDATION_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};
