'use client';

import { useId, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelDialog, PanelDialogClose, PanelField, PanelTextarea } from '@/app/(app)/_components/panel-ui';
import { CANCELLATION_REASON_MAX_LENGTH } from '@/src/entities/models/booking';
import type { BookingActionResult } from '../actions';

/**
 * Confirma Cancelar o Rechazar un Turno con un Motivo de cancelación opcional, que le llega al Cliente en el Aviso de
 * cambio del Turno. Un Motivo que el back rechaza por largo queda bajo el campo con el diálogo abierto; el éxito y
 * cualquier otro error se avisan con un toast y lo cierran.
 *
 * @param confirm corre la acción con el Motivo (`undefined` si quedó vacío)
 * @param success el toast del éxito
 */
export function ReasonConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    confirm,
    success,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    confirm: (reason: string | undefined) => Promise<BookingActionResult>;
    success: string;
}) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const formId = useId();
    const fieldId = `${formId}-reason`;

    const close = () => {
        setReason('');
        setError(undefined);
        onOpenChange(false);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        startTransition(async () => {
            const result = await confirm(reason.trim() || undefined);
            if (!result.ok && result.field === 'reason') return setError(result.message);
            if (result.ok) toast.success(success);
            else toast.error(result.message);
            close();
        });
    };

    return (
        <PanelDialog
            open={open}
            onOpenChange={(next) => (next ? onOpenChange(true) : !pending && close())}
            title={title}
            description={description}
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost" disabled={pending}>
                            Volver
                        </PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form={formId} variant="destructive" disabled={pending} className="min-w-[132px]">
                        {pending ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
                    </PanelButton>
                </>
            }
        >
            <form id={formId} onSubmit={submit} noValidate>
                <PanelField label="Motivo" htmlFor={fieldId} hint="Opcional. Se lo mandamos al Cliente en el aviso." error={error}>
                    <PanelTextarea
                        id={fieldId}
                        value={reason}
                        maxLength={CANCELLATION_REASON_MAX_LENGTH}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setError(undefined);
                        }}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${fieldId}-error` : undefined}
                    />
                </PanelField>
            </form>
        </PanelDialog>
    );
}
