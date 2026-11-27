'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { BackResult } from '@/app/_components/back';
import { Button, type ButtonProps } from '@/app/_components/ui/button';

export function ActionButton({
    action,
    children,
    variant,
    size,
    disabledReason,
    confirm,
    successMessage,
    refreshOnError = false,
}: {
    action: () => Promise<BackResult>;
    children: React.ReactNode;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
    disabledReason?: string | null;
    confirm?: string;
    successMessage?: string;
    refreshOnError?: boolean;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function run() {
        if (confirm && !window.confirm(confirm)) return;
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (result.ok) {
                if (successMessage) toast.success(successMessage);
                return router.refresh();
            }
            setError(result.message);
            if (refreshOnError) {
                toast.error(result.message);
                router.refresh();
            }
        });
    }

    return (
        <div className="flex flex-col gap-1">
            <Button variant={variant} size={size} loading={pending} disabled={!!disabledReason} onClick={run}>
                {children}
            </Button>
            {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
