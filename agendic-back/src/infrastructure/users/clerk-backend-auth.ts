import {
  createClerkClient,
  verifyToken as verifyClerkToken,
} from '@clerk/backend';
import { Injectable } from '@nestjs/common';
import {
  ExternalServiceError,
  UnauthenticatedError,
} from '../../domain/errors';
import {
  ClerkAuth,
  ClerkIdentity,
  ClerkProfile,
  ClerkProfileSeed,
} from '../../domain/users/clerk-auth';
import { readFrontendUrl } from '../nodemailer-mailer';

@Injectable()
export class ClerkBackendAuth implements ClerkAuth {
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async verifyToken(token: string | undefined): Promise<ClerkIdentity> {
    if (!token) throw new UnauthenticatedError('Missing Clerk token');
    try {
      const payload = await verifyClerkToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      return {
        clerkId: payload.sub,
        profile: profileClaims(payload),
      };
    } catch (error) {
      throw new UnauthenticatedError('Invalid or expired Clerk token', {
        cause: error,
      });
    }
  }

  async getProfile(clerkId: string): Promise<ClerkProfileSeed> {
    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    const email =
      clerkUser.emailAddresses.find(
        (address) => address.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? '';
    const name =
      [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || email;
    // hasImage is false when Clerk would only serve its own placeholder.
    const imageUrl = clerkUser.hasImage ? parseUrl(clerkUser.imageUrl) : null;
    return { name, email, imageUrl };
  }

  async inviteByEmail(email: string): Promise<void> {
    try {
      await this.clerkClient.invitations.createInvitation({
        emailAddress: email,
        ignoreExisting: true,
        notify: true,
        // Without it the mail's link lands on Clerk's own accounts portal instead of Agendic's sign-up, which takes the ticket.
        redirectUrl: `${readFrontendUrl()}/sign-up`,
      });
    } catch (error) {
      if (isExistingAccount(error)) return;
      throw new ExternalServiceError('No se pudo enviar la invitaci�n', {
        cause: error,
      });
    }
  }

  /**
   * @throws {ExternalServiceError} Clerk falló con algo distinto de "el Usuario no existe"
   */
  async deleteUser(clerkId: string): Promise<void> {
    try {
      await this.clerkClient.users.deleteUser(clerkId);
    } catch (error) {
      if (isMissingUser(error)) return;
      throw new ExternalServiceError(
        'No se pudo borrar el Usuario en el Proveedor de autenticación',
        { cause: error },
      );
    }
  }
}

/** Clerk answers 404 `resource_not_found` for a user it no longer has. */
function isMissingUser(error: unknown): boolean {
  const { status, errors } = error as {
    status?: number;
    errors?: { code?: string }[];
  };
  return (
    status === 404 || !!errors?.some((e) => e.code === 'resource_not_found')
  );
}

/** Clerk answers 422 `form_identifier_exists` when the email already has an account. */
function isExistingAccount(error: unknown): boolean {
  const errors = (error as { errors?: { code?: string }[] }).errors;
  return !!errors?.some((e) => e.code === 'form_identifier_exists');
}

/** Reads the `name`/`email` session token custom claims, absent unless both are set. */
function profileClaims(
  payload: Record<string, unknown>,
): ClerkProfile | undefined {
  const { name, email } = payload;
  if (typeof name !== 'string' || typeof email !== 'string') return undefined;
  return { name, email };
}

/** A malformed imageUrl is discarded rather than failing the User's creation. */
function parseUrl(value: string): string | null {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}
