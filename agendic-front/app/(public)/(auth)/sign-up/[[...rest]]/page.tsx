import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { AUTH_OFFLINE } from '@/src/entities/models/offline-session';
import { clerkAppearance } from '../../clerk-appearance';
import { OfflineSignIn } from '../../offline-sign-in';

export const metadata: Metadata = {
    title: 'Crear cuenta — Agendic',
};

export default function SignUpPage() {
    return (
        <ViewTransition enter="auth-in" exit="auth-out" default="none">
            <div className="flex items-center justify-center w-[640px] max-w-full">
                {AUTH_OFFLINE ? <OfflineSignIn /> : <SignUp appearance={clerkAppearance} />}
            </div>
        </ViewTransition>
    );
}
