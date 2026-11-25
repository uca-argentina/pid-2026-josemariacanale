'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { BackResult } from '@/app/_components/back';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';
import { Button } from '@/app/_components/ui/button';
import { Label } from '@/app/_components/ui/label';
import { Textarea } from '@/app/_components/ui/textarea';

/**
 * Un formulario de un solo texto (motivo, respuesta, comentario) que manda a una Server Action. Si sale bien,
 * limpia el campo, avisa con `onDone` y recarga la página; si no, muestra el mensaje del back.
 */
export function TextForm({
    action,
    label,
    submitLabel,
    placeholder,
    onDone,
}: {
    action: (text: string) => Promise<BackResult>;
    label: string;
    submitLabel: string;
    placeholder?: string;
    onDone?: () => void;
}) {
    const router = useRouter();
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function submit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
            const result = await action(text);
            if (!result.ok) return setError(result.message);
            setText('');
            onDone?.();
            router.refresh();
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <Label htmlFor="text-form-field">{label}</Label>
            <Textarea
                id="text-form-field"
                value={text}
                placeholder={placeholder}
                required
                onChange={(event) => setText(event.target.value)}
            />
            {error && (
                <Alert variant="error">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button type="submit" loading={pending} className="self-end">
                {submitLabel}
            </Button>
        </form>
    );
}
