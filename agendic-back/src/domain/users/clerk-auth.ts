export const CLERK_AUTH = Symbol('ClerkAuth');

export interface ClerkProfile {
  name: string;
  email: string;
}

export interface ClerkIdentity {
  /** The Clerk user id (`sub`). */
  clerkId: string;
  /** Name and email carried as session token custom claims; absent when not configured in Clerk or on an old token. */
  profile?: ClerkProfile;
}

export interface ClerkAuth {
  /** Verifies a Clerk session JWT. Throws UnauthenticatedError otherwise. */
  verifyToken(token: string | undefined): Promise<ClerkIdentity>;
  /** Fetches the profile Clerk holds for a user id, to seed a local User on its first sight. */
  getProfile(clerkId: string): Promise<ClerkProfile>;
}
