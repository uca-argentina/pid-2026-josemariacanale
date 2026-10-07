import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ExternalServiceError,
  ForbiddenError,
  InvalidCodeError,
  NotFoundError,
  TooManyRequestsError,
  UnauthenticatedError,
} from '../domain/errors';

const STATUS_BY_ERROR: [typeof DomainError, number][] = [
  [InvalidCodeError, 400],
  [UnauthenticatedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [BusinessRuleError, 422],
  [TooManyRequestsError, 429],
  [ExternalServiceError, 502],
];

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const statusCode =
      STATUS_BY_ERROR.find(([type]) => error instanceof type)?.[1] ?? 500;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, message: error.message });
  }
}
