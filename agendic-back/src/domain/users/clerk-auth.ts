export const CLERK_AUTH = Symbol('ClerkAuth');

export interface ClerkProfile {
  name: string;
  email: string;
}

/** `ClerkProfile` plus the photo, read from the Clerk API only when seeding a brand-new User. */
export interface ClerkProfileSeed extends ClerkProfile {
  imageUrl: string | null;
}

export interface ClerkIdentity {
  /** The Clerk user id (`sub`). */
  clerkId: string;
  /** Name and email carried as session token custom claims; absent when not configured in Clerk or on an old token. */
  profile?: ClerkProfile;
  /**
   * The foto de perfil carried as a session token custom claim: `null` when Clerk says there is no real one.
   * Absent (`undefined`) when the claim is not configured or on an old token, which is not the same as `null`.
   */
  imageUrl?: string | null;
}

export interface ClerkAuth {
  /** Verifies a Clerk session JWT. Throws UnauthenticatedError otherwise. */
  verifyToken(token: string | undefined): Promise<ClerkIdentity>;
  /** Fetches the profile Clerk holds for a user id, to seed a local User on its first sight. */
  getProfile(clerkId: string): Promise<ClerkProfileSeed>;
  /**
   * Asks Clerk to mail an invitation to create an Agendic account. An email that already has a Clerk account is not an error.
   * Throws ExternalServiceError when Clerk fails.
   */
  inviteByEmail(email: string): Promise<void>;
  /**
   * Deletes the Usuario's identity in Clerk, so registering again with the same email makes a new one (ADR 0024).
   * A Usuario Clerk no longer has is not an error. Throws ExternalServiceError when Clerk fails.
   */
  deleteUser(clerkId: string): Promise<void>;
}
