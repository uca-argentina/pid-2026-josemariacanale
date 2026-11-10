import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SIGNED_IN_HOME_PATH } from '@/app/routes';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { AUTH_OFFLINE, OFFLINE_SESSION_COOKIE } from '@/src/entities/models/offline-session';

async function offlineSignIn(formData: FormData) {
    'use server';
    if (!AUTH_OFFLINE) throw new UnauthenticatedError('Offline sign-in is disabled: NEXT_PUBLIC_AUTH_OFFLINE is not "true"');
    const clerkId = String(formData.get('clerkId') ?? '').trim();
    if (!clerkId) throw new UnauthenticatedError('Offline sign-in needs a clerkId');
    (await cookies()).set(OFFLINE_SESSION_COOKIE, clerkId, { path: '/', sameSite: 'lax' });
    redirect(SIGNED_IN_HOME_PATH);
}

/** Replaces Clerk's <SignIn/> and <SignUp/> with NEXT_PUBLIC_AUTH_OFFLINE=true: entra como el Usuario con ese clerkId. */
export function OfflineSignIn() {
    return (
        <form action={offlineSignIn} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-xl font-semibold">Iniciar sesión (modo offline)</h1>
            <p className="text-sm text-muted-foreground">
                Sin Clerk: escribí el clerkId de un Usuario de la base para entrar como él, o uno nuevo para crearlo.
            </p>
            <input
                name="clerkId"
                required
                defaultValue="user_offline"
                className="rounded-lg border px-3 py-2 text-sm"
                aria-label="clerkId"
            />
            <button type="submit" className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-white">
                Entrar
            </button>
        </form>
    );
}
