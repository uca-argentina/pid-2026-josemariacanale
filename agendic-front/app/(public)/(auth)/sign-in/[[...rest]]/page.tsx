import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { clerkAppearance } from '../../clerk-appearance';

export const metadata: Metadata = {
    title: 'Iniciar sesión — Agendic',
};

export default function SignInPage() {
    return (
        <ViewTransition enter="auth-in" exit="auth-out" default="none">
            <div className="flex items-center justify-center w-[640px] max-w-full">
                <SignIn appearance={clerkAppearance} />
            </div>
        </ViewTransition>
    );
}
