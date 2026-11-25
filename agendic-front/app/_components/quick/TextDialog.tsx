'use client';

import { useState } from 'react';
import type { BackResult } from '@/app/_components/back';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/ui/dialog';
import { TextForm } from './TextForm';

/** Un botón que abre un modal con un `TextForm` (para responder, rechazar con motivo, etc.) y se cierra al guardar. */
export function TextDialog({
    action,
    trigger,
    title,
    label,
    submitLabel,
}: {
    action: (text: string) => Promise<BackResult>;
    trigger: string;
    title: string;
    label: string;
    submitLabel: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <TextForm action={action} label={label} submitLabel={submitLabel} onDone={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
