import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { AUTH_OFFLINE } from '@/src/entities/models/offline-session';
import { clerkAppearance } from '../../clerk-appearance';
import { OfflineSignIn } from '../../offline-sign-in';

export const metadata: Metadata = {
    title: 'Iniciar sesión — Agendic',
};

export default function SignInPage() {
    return (
        <ViewTransition enter="auth-in" exit="auth-out" default="none">
            <div className="flex items-center justify-center w-[640px] max-w-full">
                {AUTH_OFFLINE ? <OfflineSignIn /> : <SignIn appearance={clerkAppearance} />}
            </div>
        </ViewTransition>
    );
}
