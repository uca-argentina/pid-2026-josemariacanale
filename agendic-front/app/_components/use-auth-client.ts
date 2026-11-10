'use client';

import { useClerk } from '@clerk/nextjs';
import { useMemo } from 'react';
import { AUTH_OFFLINE, OFFLINE_SESSION_COOKIE } from '@/src/entities/models/offline-session';

export interface AuthClient {
    signOut(options?: { redirectUrl?: string }): Promise<void>;
    openUserProfile(): void;
}

function useClerkAuthClient(): AuthClient {
    const clerk = useClerk();
    // Stable across renders, like Clerk's own: SignOutOnDeactivated runs an effect on it.
    return useMemo(
        () => ({ signOut: (options) => clerk.signOut(options), openUserProfile: () => clerk.openUserProfile() }),
        [clerk],
    );
}

// Offline there is no ClerkProvider, so useClerk() would throw: the Sesión is just a cookie to delete.
function useOfflineAuthClient(): AuthClient {
    return useMemo(
        () => ({
            signOut: async ({ redirectUrl = '/' } = {}) => {
                document.cookie = `${OFFLINE_SESSION_COOKIE}=; Max-Age=0; path=/`;
                window.location.assign(redirectUrl);
            },
            openUserProfile: () => console.info('Modo offline: el perfil de Clerk no está disponible'),
        }),
        [],
    );
}

/** Clerk's client session, or its offline stand-in with NEXT_PUBLIC_AUTH_OFFLINE=true (fixed at build time). */
export const useAuthClient = AUTH_OFFLINE ? useOfflineAuthClient : useClerkAuthClient;
