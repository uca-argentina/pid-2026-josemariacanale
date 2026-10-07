import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import {
  CLIENT_ACCESS_TOKENS,
  ClientAccessTokens,
} from '../../domain/bookings/client-access-tokens';
import { UnauthenticatedError } from '../../domain/errors';

type ClientAuthenticatedRequest = Request & { clientEmail: string };

/** Resolves `X-Client-Access: <access>` to the Cliente's email; read the result with `@ClientEmail()`. */
@Injectable()
export class ClientAccessGuard implements CanActivate {
  constructor(
    @Inject(CLIENT_ACCESS_TOKENS) private readonly tokens: ClientAccessTokens,
  ) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ClientAuthenticatedRequest>();
    const header = request.headers['x-client-access'];
    const access = typeof header === 'string' ? header : undefined;
    const email = access ? this.tokens.verify(access) : null;
    if (!email) throw new UnauthenticatedError('Client access missing or expired');
    request.clientEmail = email;
    return true;
  }
}

export const ClientEmail = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<ClientAuthenticatedRequest>().clientEmail,
);
