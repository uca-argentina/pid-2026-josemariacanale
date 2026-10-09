'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';

/** El back rechazó la Sesión porque el Usuario está dado de baja (ADR 0024): se la cierra y se vuelve al inicio. */
export function SignOutOnDeactivated() {
    const { signOut } = useClerk();
    useEffect(() => {
        void signOut({ redirectUrl: '/' });
    }, [signOut]);
    return null;
}
