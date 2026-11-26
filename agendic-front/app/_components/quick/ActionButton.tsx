'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { BackResult } from '@/app/_components/back';
import { Button, type ButtonProps } from '@/app/_components/ui/button';

/** Un botón que corre una Server Action sin datos (aceptar, cancelar, borrar) y recarga la página si salió bien. */
export function ActionButton({
    action,
    children,
    variant,
}: {
    action: () => Promise<BackResult>;
    children: React.ReactNode;
    variant?: ButtonProps['variant'];
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function run() {
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (!result.ok) return setError(result.message);
            router.refresh();
        });
    }

    return (
        <div className="flex flex-col gap-1">
            <Button variant={variant} loading={pending} onClick={run}>
                {children}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
