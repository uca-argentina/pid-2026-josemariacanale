'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelField, PanelNumberField, PanelSection, PanelToggleRow } from '@/app/(app)/_components/panel-ui';
import { saveStreakProgramAction } from '../actions';
import { burnDaysError, shortensBurnTime } from './streak-form';

/**
 * El interruptor de las Rachas y su Tiempo de quemada; avisa si lo que se tipeó acorta el que está guardado. El campo
 * va sin `min` ni `max`: los aplicaría en silencio mientras se tipea, y el rango lo avisa `burnDaysError`.
 */
export function StreakProgramForm({
    businessId,
    active: savedActive,
    burnAfterDays,
}: {
    businessId?: number;
    active: boolean;
    burnAfterDays: number | null;
}) {
    const [active, setActive] = useState(savedActive);
    const [days, setDays] = useState(burnAfterDays === null ? '' : String(burnAfterDays));
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        const invalid = burnDaysError(days);
        setError(invalid);
        if (invalid) return;
        startTransition(async () => {
            const result = await saveStreakProgramAction({ businessId, active, burnAfterDays: Number(days) });
            if (result.ok) toast.success('Guardamos las Rachas');
            else if (result.field) setError(result.message);
            else toast.error(result.message);
        });
    };

    return (
        <PanelSection title="Configuración" description="Premiá a los Clientes que vuelven seguido.">
            <form onSubmit={save} noValidate className="flex flex-col gap-6 p-6">
                <PanelToggleRow
                    id="streaks-active"
                    title="Activar las Rachas"
                    description="Cada Turno atendido suma a la Racha del Cliente, que gana las Recompensas que cargues."
                    checked={active}
                    disabled={isPending}
                    onCheckedChange={setActive}
                />
                <div className="max-w-xs">
                    <PanelField
                        label="Tiempo de quemada"
                        htmlFor="streaks-burn-days"
                        error={error}
                        hint="La Racha se quema si pasa más que este tiempo sin un Turno atendido."
                    >
                        <PanelNumberField
                            id="streaks-burn-days"
                            suffix="días"
                            value={days}
                            disabled={isPending}
                            aria-describedby={error ? 'streaks-burn-days-error' : undefined}
                            onValueChange={setDays}
                        />
                    </PanelField>
                    {shortensBurnTime(burnAfterDays, days) && (
                        <p role="status" className="m-0 mt-2 text-[12.5px] font-medium text-[#b45309]">
                            Acortarlo puede quemar Rachas en curso
                        </p>
                    )}
                </div>
                <div>
                    <PanelButton type="submit" disabled={isPending} className="min-w-[88px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                    </PanelButton>
                </div>
            </form>
        </PanelSection>
    );
}
