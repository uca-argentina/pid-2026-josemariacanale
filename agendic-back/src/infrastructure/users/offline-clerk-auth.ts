import { Injectable } from '@nestjs/common';
import { NotConfiguredError, UnauthenticatedError } from '../../domain/errors';
import {
  ClerkAuth,
  ClerkIdentity,
  ClerkProfileSeed,
} from '../../domain/users/clerk-auth';

const TOKEN_PREFIX = 'dev:';

/** True when `AUTH_OFFLINE=true`: the back trusts `dev:<clerkId>` tokens instead of asking Clerk. */
export function isAuthOffline(): boolean {
  return process.env.AUTH_OFFLINE === 'true';
}

/**
 * Local-development stand-in for Clerk, to work without internet. Any `Bearer dev:<clerkId>` is accepted as that
 * Usuario, with no signature at all: refuses to exist in production.
 */
@Injectable()
export class OfflineClerkAuth implements ClerkAuth {
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotConfiguredError(
        'AUTH_OFFLINE=true is not allowed with NODE_ENV=production',
      );
    }
  }

  verifyToken(token: string | undefined): Promise<ClerkIdentity> {
    if (!token) {
      return Promise.reject(new UnauthenticatedError('Missing Clerk token'));
    }
    if (!token.startsWith(TOKEN_PREFIX) || token === TOKEN_PREFIX) {
      return Promise.reject(
        new UnauthenticatedError(
          `Offline auth expects a "${TOKEN_PREFIX}<clerkId>" token`,
        ),
      );
    }
    return Promise.resolve({ clerkId: token.slice(TOKEN_PREFIX.length) });
  }

  getProfile(clerkId: string): Promise<ClerkProfileSeed> {
    return Promise.resolve({
      name: clerkId,
      email: `${clerkId}@local.test`.toLowerCase(),
      imageUrl: null,
    });
  }

  inviteByEmail(): Promise<void> {
    return Promise.resolve();
  }

  deleteUser(): Promise<void> {
    return Promise.resolve();
  }
}
