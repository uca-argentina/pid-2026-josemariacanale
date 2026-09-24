'use client';

import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';

// Safety net for anything the server components did not catch. A 401 never lands here: the call
// sites redirect to Iniciar sesión before the error escapes (see app/api-error.ts). The error's
// own message is deliberately not rendered: for a server error Next already logged it and only
// forwards a digest, and for a client render error there is nothing here worth showing.
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-muted">
            <BackendErrorNotice onRetry={retry} />
        </main>
    );
}
