import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError } from '../../domain/errors';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import { User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/**
 * Resolves the Clerk JWT of the current request to a local User, creating it on its first sight.
 *
 * @throws {ForbiddenError} el Usuario está dado de baja (ADR 0024) y la ruta no lo admite con `allowRetired`
 */
@Injectable()
export class ResolveCurrentUserUseCase {
  constructor(
    @Inject(CLERK_AUTH) private readonly clerkAuth: ClerkAuth,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async execute(
    token: string | undefined,
    { allowRetired = false }: { allowRetired?: boolean } = {},
  ): Promise<User> {
    const { clerkId, profile, imageUrl } =
      await this.clerkAuth.verifyToken(token);
    const existing = await this.users.findByClerkId(clerkId);
    if (!existing) {
      const seed = await this.clerkAuth.getProfile(clerkId);
      // The panel fires several requests at once on a User's first visit: the ones that lose the race hit the unique `clerkId`.
      return this.users.create({ clerkId, ...seed }).catch(async (error) => {
        const created =
          error instanceof ConflictError &&
          (await this.users.findByClerkId(clerkId));
        if (!created) throw error;
        return created;
      });
    }
    if (existing.deletedAt && !allowRetired)
      throw new ForbiddenError(`User ${existing.id} is dado de baja`);
    if (existing.deletedAt) return existing;
    const changes: Parameters<UsersRepository['update']>[1] = {};
    if (
      profile &&
      (profile.name !== existing.name || profile.email !== existing.email)
    ) {
      changes.name = profile.name;
      changes.email = profile.email;
    }
    if (imageUrl !== undefined && imageUrl !== existing.imageUrl)
      changes.imageUrl = imageUrl;
    if (Object.keys(changes).length === 0) return existing;
    return this.users.update(existing.id, changes).catch(() => existing);
  }
}
