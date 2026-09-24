'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/app/_components/ui/button';

// The only text the Usuario sees when the back fails. The back's own message never reaches
// here: it is reported on the server (see the crash reporter) and dropped from the interface.
export function BackendErrorNotice({ onRetry }: { onRetry?: () => void }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Without a boundary to reset, retrying means asking the server for the page again.
    const retry = onRetry ?? (() => startTransition(() => router.refresh()));

    return (
        <div
            role="alert"
            className="mx-auto flex max-w-[420px] flex-col items-center gap-2.5 px-7 py-15 text-center"
        >
            <div className="text-[16px] font-extrabold tracking-[-0.02em]">No pudimos cargar tus datos</div>
            <div className="text-[13px] font-medium text-muted-foreground">
                Hubo un problema de nuestro lado. Probá de nuevo en unos segundos.
            </div>
            <Button
                onClick={retry}
                disabled={isPending}
                className="mt-1.5 h-auto rounded-[10px] px-4 py-2 text-[13px] font-bold"
            >
                Reintentar
            </Button>
        </div>
    );
}
