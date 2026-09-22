'use client';

import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs';

// Wraps Clerk's headless SignOutButton so callers keep their own markup — no Clerk UI is rendered.
export function SignOutButton({ children }: { children: React.ReactNode }) {
    return <ClerkSignOutButton redirectUrl="/">{children}</ClerkSignOutButton>;
}
