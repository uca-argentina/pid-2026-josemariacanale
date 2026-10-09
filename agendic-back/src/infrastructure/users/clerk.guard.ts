import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ResolveCurrentUserUseCase } from '../../application/users/resolve-current-user.use-case';
import { extractBearerToken } from '../bearer-token';

type AuthenticatedRequest = Request & { userId: number };

const ALLOW_RETIRED_USER = 'allowRetiredUser';

/** Lets a Usuario dado de baja through `ClerkGuard`; only `DELETE /users/me`, to retry the borrado en Clerk (ADR 0023). */
export const AllowRetiredUser = () => SetMetadata(ALLOW_RETIRED_USER, true);

/** Resolves `Authorization: Bearer <Clerk JWT>`; read the result with `@CurrentUser()`. */
@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(
    private readonly resolveCurrentUser: ResolveCurrentUserUseCase,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    const allowRetired = this.reflector.get<boolean>(
      ALLOW_RETIRED_USER,
      context.getHandler(),
    );
    const user = await this.resolveCurrentUser.execute(token, { allowRetired });
    request.userId = user.id;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
