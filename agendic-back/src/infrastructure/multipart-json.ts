import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  PipeTransform,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { VALIDATION_OPTIONS } from './validation-options';

/** Parses a multipart text field as a JSON object and validates it into `dto`, like a JSON body. */
class ParseJsonFieldPipe implements PipeTransform<unknown, Promise<unknown>> {
  constructor(
    private readonly field: string,
    private readonly dto: Type,
  ) {}

  async transform(value: unknown) {
    if (typeof value !== 'string')
      throw new BadRequestException(`${this.field} is required`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException(`${this.field} must be valid JSON`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      throw new BadRequestException(`${this.field} must be a JSON object`);
    return new ValidationPipe(VALIDATION_OPTIONS).transform(parsed, {
      type: 'body',
      metatype: this.dto,
    });
  }
}

const MultipartField = createParamDecorator(
  (field: string, ctx: ExecutionContext): unknown =>
    ctx.switchToHttp().getRequest<{ body?: Record<string, unknown> }>().body?.[
      field
    ],
);

/**
 * Reads multipart field `field`, a JSON string, as a `dto` validated with the same rules as a JSON body: for an
 * endpoint that takes data and files in one request. Missing, not JSON, not an object, or not passing `dto` is a 400.
 * Needs the route's multer interceptor, which fills the request body with the text fields.
 *
 * @throws {BadRequestException} el campo falta, no es JSON, no es un objeto o no pasa la validación de `dto`
 */
export const MultipartJson = (field: string, dto: Type) =>
  MultipartField(field, new ParseJsonFieldPipe(field, dto));
