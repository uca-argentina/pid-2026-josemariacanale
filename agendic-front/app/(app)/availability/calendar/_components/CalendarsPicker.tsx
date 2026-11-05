'use client';

import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/_components/ui/badge';
import { Button } from '@/app/_components/ui/button';
import { Checkbox } from '@/app/_components/ui/checkbox';
import { Label } from '@/app/_components/ui/label';
import type { AccountCalendar } from '@/src/entities/models/calendar-connection';
import { setCheckedCalendarsAction } from '../actions';

/** Los ids de los calendarios tildados. */
const checkedIdsOf = (calendars: AccountCalendar[]) => calendars.filter((c) => c.checked).map((c) => c.id);

/**
 * Los calendarios de la cuenta conectada, para tildar cuáles cuentan como Ocupado externo. Se guarda con un solo
 * `PUT` y la lista refleja la respuesta. Aclara que los Turnos se escriben siempre en el principal.
 */
export function CalendarsPicker({ calendars }: { calendars: AccountCalendar[] }) {
    const [saved, setSaved] = useState(calendars);
    const [checked, setChecked] = useState(() => new Set(checkedIdsOf(calendars)));
    const [busy, setBusy] = useState(false);

    const savedIds = new Set(checkedIdsOf(saved));
    const dirty = saved.some((c) => checked.has(c.id) !== savedIds.has(c.id));

    const toggle = (id: string, value: boolean) =>
        setChecked((current) => {
            const next = new Set(current);
            if (value) next.add(id);
            else next.delete(id);
            return next;
        });

    const save = async () => {
        setBusy(true);
        const result = await setCheckedCalendarsAction(saved.filter((c) => checked.has(c.id)).map((c) => c.id));
        setBusy(false);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }
        setSaved(result.calendars);
        setChecked(new Set(checkedIdsOf(result.calendars)));
        toast.success('Guardamos tu selección.');
    };

    return (
        <section className="mt-6 flex flex-col gap-3 rounded-md border p-4" aria-labelledby="calendars-title">
            <div className="flex flex-col gap-1">
                <h2 id="calendars-title" className="m-0 text-base font-bold">
                    Calendarios que bloquean tus horarios
                </h2>
                <p className="m-0 text-sm text-muted-foreground">
                    Los eventos de los calendarios tildados te dejan ocupado en Agendic. Tus Turnos se escriben siempre en el calendario principal.
                </p>
            </div>

            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {saved.map((calendar) => (
                    <li key={calendar.id} className="flex items-center gap-2">
                        <Checkbox
                            id={`calendar-${calendar.id}`}
                            checked={checked.has(calendar.id)}
                            onCheckedChange={(value) => toggle(calendar.id, value)}
                            disabled={busy}
                        />
                        <Label htmlFor={`calendar-${calendar.id}`} className="min-w-0 font-normal">
                            <span className="truncate">{calendar.name}</span>
                        </Label>
                        {calendar.primary && <Badge variant="secondary">Principal</Badge>}
                    </li>
                ))}
            </ul>

            {checked.size === 0 && (
                <p role="status" className="m-0 flex items-start gap-2 text-sm text-muted-foreground">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    Ningún calendario va a bloquear tus horarios.
                </p>
            )}

            <div>
                <Button type="button" disabled={busy || !dirty} onClick={save}>
                    Guardar
                </Button>
            </div>
        </section>
    );
}
