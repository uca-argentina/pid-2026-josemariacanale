'use client';

import { useState, useTransition } from 'react';
import { CalendarIcon } from 'lucide-react';
import { es } from '@daypicker/react/locale';
import type { DateRange } from '@daypicker/react';
import { toast } from 'sonner';
import { Button } from '@/app/_components/ui/button';
import { Calendar } from '@/app/_components/ui/calendar';
import { Checkbox } from '@/app/_components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import { Label } from '@/app/_components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import { Textarea } from '@/app/_components/ui/textarea';
import type { OutOfOffice, OutOfOfficeReason } from '@/src/entities/models/out-of-office';
import { createOutOfOfficeAction, updateOutOfOfficeAction } from '../actions';
import { formatOutOfOfficeDate } from './format-out-of-office-date';
import { OUT_OF_OFFICE_REASONS } from './out-of-office-reasons';
import { fromCalendarRange, toCalendarRange } from './out-of-office-range';

/** Al crear, el rango arranca en hoy y mañana, como en cal.diy. */
const todayAndTomorrow = (): DateRange => {
    const today = new Date();
    return { from: today, to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
};

/**
 * El modal "Fuera de la oficina": rango de fechas, Motivo, notas y si la nota es pública. Con `period` edita ese
 * período; sin él, crea uno. El 422 y el 409 del back se muestran dentro, sin cerrarlo.
 *
 * @param weekStart primer día de la semana del Usuario (0 = domingo), para el Calendar
 * @param onClose se llama al cancelar, al cerrar y tras guardar
 */
export function OutOfOfficeDialog({
    period,
    weekStart,
    onClose,
}: {
    period: OutOfOffice | null;
    weekStart: number;
    onClose: () => void;
}) {
    const [range, setRange] = useState<DateRange | undefined>(period ? toCalendarRange(period) : todayAndTomorrow());
    const [reason, setReason] = useState<OutOfOfficeReason>(period?.reason ?? 'UNSPECIFIED');
    const [notes, setNotes] = useState(period?.notes ?? '');
    const [showNotePublicly, setShowNotePublicly] = useState(period?.showNotePublicly ?? false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const days = fromCalendarRange(range);
    const hasNotes = notes.trim() !== '';

    const save = () =>
        startTransition(async () => {
            if (!days) return;
            const input = { ...days, reason, notes: notes.trim() || undefined, showNotePublicly: hasNotes && showNotePublicly };
            const result = period ? await updateOutOfOfficeAction(period.id, input) : await createOutOfOfficeAction(input);
            if (!result.ok) return setError(result.message);
            toast.success(period ? 'Período actualizado' : 'Período creado');
            onClose();
        });

    return (
        <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{period ? 'Editar período fuera de la oficina' : 'Crear un período fuera de la oficina'}</DialogTitle>
                </DialogHeader>
                <form
                    id="out-of-office-form"
                    className="flex flex-col gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    <div className="flex flex-col gap-1.5">
                        <Label>Fechas</Label>
                        <Popover>
                            <PopoverTrigger
                                render={
                                    <Button type="button" variant="outline" className="w-full justify-start font-normal" data-testid="date-range-trigger" />
                                }
                            >
                                <CalendarIcon />
                                {days
                                    ? `${formatOutOfOfficeDate(days.startDate)} - ${formatOutOfOfficeDate(days.endDate)}`
                                    : 'Elegí las fechas'}
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-auto p-2">
                                <Calendar
                                    mode="range"
                                    locale={es}
                                    weekStartsOn={weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6}
                                    defaultMonth={range?.from}
                                    selected={range}
                                    onSelect={setRange}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Motivo</Label>
                        <Select value={reason} onValueChange={(value) => value && setReason(value as OutOfOfficeReason)}>
                            <SelectTrigger className="w-full" aria-label="Motivo" data-testid="reason-select">
                                <SelectValue>
                                    {(value: OutOfOfficeReason) => `${OUT_OF_OFFICE_REASONS[value].emoji} ${OUT_OF_OFFICE_REASONS[value].label}`}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(OUT_OF_OFFICE_REASONS).map(([value, { emoji, label }]) => (
                                    <SelectItem key={value} value={value}>
                                        {emoji} {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="out-of-office-notes">Notas</Label>
                        <Textarea
                            id="out-of-office-notes"
                            placeholder="Notas adicionales"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                        />
                        <div className="mt-1 flex items-center gap-2">
                            <Checkbox
                                id="show-note-publicly"
                                checked={hasNotes && showNotePublicly}
                                onCheckedChange={setShowNotePublicly}
                                disabled={!hasNotes}
                            />
                            <Label htmlFor="show-note-publicly" className="font-normal">
                                Mostrar nota en la página pública de reservas
                            </Label>
                        </div>
                    </div>

                    {error && (
                        <p role="alert" className="m-0 text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="out-of-office-form" disabled={!days || isPending}>
                        {period ? 'Guardar' : 'Crear'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
