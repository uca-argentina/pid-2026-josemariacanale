'use client';

import { useEffect } from 'react';
import { useAuthClient } from '@/app/_components/use-auth-client';

/** El back rechazó la Sesión porque el Usuario está dado de baja (ADR 0024): se la cierra y se vuelve al inicio. */
export function SignOutOnDeactivated() {
    const { signOut } = useAuthClient();
    useEffect(() => {
        void signOut({ redirectUrl: '/' });
    }, [signOut]);
    return null;
}
