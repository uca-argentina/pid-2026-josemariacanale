'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateMyPreferencesAction } from '@/app/(app)/actions';
import type { Preferences } from '@/src/entities/models/user';
import { PanelButton, PanelDialog, PanelDialogClose, PanelField, PanelSelect } from './panel-ui';

const TIME_FORMATS = [
    { value: '12', label: '12 horas' },
    { value: '24', label: '24 horas' },
];
const WEEK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// Lunes primero, como se lee una semana; `value` es el 0 = domingo del back.
const WEEK_STARTS = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ value: String(day), label: WEEK_DAYS[day] }));

/**
 * Edita las preferencias del Usuario: formato de hora y primer día de la semana. Guarda solo lo que cambió; con éxito
 * avisa con un toast, entrega las preferencias guardadas en `onSaved` y se cierra. Ante un error queda abierto.
 */
export function PreferencesDialog({
    preferences,
    onSaved,
    onClose,
}: {
    preferences: Preferences;
    onSaved: (preferences: Preferences) => void;
    onClose: () => void;
}) {
    const [timeFormat, setTimeFormat] = useState(String(preferences.timeFormat));
    const [weekStart, setWeekStart] = useState(String(preferences.weekStart));
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const save = () => {
        const changes: Partial<Preferences> = {};
        if (Number(timeFormat) !== preferences.timeFormat) changes.timeFormat = Number(timeFormat) as Preferences['timeFormat'];
        if (Number(weekStart) !== preferences.weekStart) changes.weekStart = Number(weekStart);
        if (Object.keys(changes).length === 0) return onClose();
        setError(undefined);
        startTransition(async () => {
            const result = await updateMyPreferencesAction(changes);
            if (!result.ok) return setError(result.message);
            toast.success('Preferencias guardadas');
            onSaved(result.preferences);
            onClose();
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !isPending && onClose()}
            title="Preferencias"
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost" disabled={isPending}>
                            Cancelar
                        </PanelButton>
                    </PanelDialogClose>
                    <PanelButton onClick={save} disabled={isPending} className="min-w-[96px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                    </PanelButton>
                </>
            }
        >
            <PanelField label="Formato de hora" htmlFor="pref-time-format">
                <PanelSelect id="pref-time-format" value={timeFormat} onValueChange={setTimeFormat} options={TIME_FORMATS} disabled={isPending} />
            </PanelField>
            <PanelField label="Primer día de la semana" htmlFor="pref-week-start">
                <PanelSelect id="pref-week-start" value={weekStart} onValueChange={setWeekStart} options={WEEK_STARTS} disabled={isPending} />
            </PanelField>
            {error && (
                <p role="alert" className="m-0 text-[13px] font-semibold text-[#b91c1c]">
                    {error}
                </p>
            )}
        </PanelDialog>
    );
}
