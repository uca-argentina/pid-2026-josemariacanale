'use client';

import { useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import { Button } from '@/app/_components/ui/button';
import { Switch } from '@/app/_components/ui/switch';
import { LeftOutsideBookingsDialog } from '@/app/(app)/_components/LeftOutsideBookingsDialog';
import { useLeftOutsideSave } from '@/app/(app)/_components/use-left-outside-save';
import { PanelButton, PanelConfirm, PanelSection } from '@/app/(app)/_components/panel-ui';
import {
    fromFormSchedule,
    toFormSchedule,
    weekValid,
} from '@/app/(app)/_components/availability-week';
import type { AvailabilityDetail } from '@/src/entities/models/availability';
import type { Preferences } from '@/src/entities/models/user';
import type { PreviewAvailabilityResult, SaveAvailabilityResult } from '../actions';
import type { AvailabilityDraft } from './AvailabilityView';
import { OverridesSection } from './OverridesSection';
import { ScheduleComponent, type ScheduleFormValues } from './ScheduleComponent';
import { TimezoneSelect } from '@/app/(app)/_components/TimezoneSelect';

function NameField({ name, onChange }: { name: string; onChange: (name: string) => void }) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <input
                autoFocus
                aria-label="Nombre"
                value={name}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="m-0 min-w-0 rounded-md border border-[#d1d5db] px-2 py-0.5 text-xl font-extrabold tracking-[-0.035em] outline-none focus:border-[#0f1b2d] focus:ring-1 focus:ring-[#0f1b2d]"
            />
        );
    }

    return (
        <div className="flex min-w-0 items-center gap-2">
            <h1 className={cn('m-0 truncate text-xl font-extrabold tracking-[-0.035em]', !name.trim() && 'text-[#b91c1c]')}>
                {name.trim() ? name : 'Poné un nombre para guardar'}
            </h1>
            <button
                type="button"
                aria-label="Editar nombre"
                onClick={() => setEditing(true)}
                className="rounded-md p-1 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#0f1b2d]"
            >
                <Pencil className="size-4" />
            </button>
        </div>
    );
}

/**
 * Edita nombre, zona horaria, Franjas por día, Anulaciones y si son las predeterminadas. "Guardar" manda
 * todo junto; no deja guardar si una Franja es vacía, invertida o se solapa con otra del mismo día.
 *
 * Si guardar deja Turnos afuera de las Franjas, abre el diálogo para confirmar su cancelación; "Volver" lo cierra
 * y deja el editor con los cambios sin guardar. Sin Turnos afuera, guarda directo.
 *
 * @param onPreview pide los Turnos que guardar `draft` dejaría afuera
 * @param onSave guarda `draft` y cancela los Turnos de `cancelBookingIds`
 * @param onSaved se llama al guardar, con el nombre guardado y cuántos Turnos se cancelaron
 * @param onError se llama con el mensaje de un fallo de la vista previa o del guardado
 */
export function AvailabilityEditor({
    availability,
    preferences,
    busy,
    onBack,
    onPreview,
    onSave,
    onSaved,
    onError,
    onDelete,
}: {
    availability: AvailabilityDetail;
    preferences: Preferences;
    busy: boolean;
    onBack: () => void;
    onPreview: (draft: AvailabilityDraft) => Promise<PreviewAvailabilityResult>;
    onSave: (draft: AvailabilityDraft, cancelBookingIds: number[]) => Promise<SaveAvailabilityResult>;
    onSaved: (name: string, cancelledBookings: number) => void;
    onError: (message: string) => void;
    onDelete: () => void;
}) {
    const initial = {
        name: availability.name,
        timeZone: availability.timeZone,
        overrides: availability.overrides,
        isDefault: availability.isDefault,
    };
    const [saved, setSaved] = useState(initial);
    const [draft, setDraft] = useState(initial);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const form = useForm<ScheduleFormValues>({ defaultValues: { schedule: toFormSchedule(availability.schedule) } });
    const schedule = fromFormSchedule(useWatch({ control: form.control, name: 'schedule' }));
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || form.formState.isDirty;
    const valid = draft.name.trim() !== '' && weekValid(schedule);

    /** Lo que se mandó a guardar, para dejar el editor limpio con eso si el guardado sale bien. */
    const submitted = useRef<typeof draft | null>(null);
    const leftOutside = useLeftOutsideSave<AvailabilityDraft>({
        preview: onPreview,
        save: onSave,
        onSaved: (cancelledBookings) => {
            const next = submitted.current;
            if (next) {
                setSaved(next);
                setDraft(next);
                form.reset(form.getValues());
                onSaved(next.name, cancelledBookings);
            }
        },
        onError,
    });
    const working = busy || leftOutside.isPending;

    const save = () => {
        const next = { ...draft, name: draft.name.trim() };
        submitted.current = next;
        leftOutside.run({ ...next, schedule });
    };

    return (
        <div className="flex-1 bg-white px-4 py-6 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => (dirty ? setConfirmLeave(true) : onBack())}
                    aria-label="Volver a Horas laborables"
                    className="flex size-8 items-center justify-center rounded-md text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#0f1b2d]"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <NameField name={draft.name} onChange={(name) => setDraft((d) => ({ ...d, name }))} />

                <div className="ml-auto flex items-center gap-3">
                    <label htmlFor="availability-default" className="text-sm font-medium">
                        Establecer como predeterminado
                    </label>
                    <Switch
                        id="availability-default"
                        checked={draft.isDefault}
                        disabled={saved.isDefault}
                        onCheckedChange={(isDefault) => setDraft((d) => ({ ...d, isDefault }))}
                    />
                    <Button
                        variant="outline"
                        size="icon-lg"
                        aria-label="Eliminar"
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                        disabled={working}
                        onClick={() => setConfirmDelete(true)}
                    >
                        <Trash2 />
                    </Button>
                    <PanelButton className="px-4" disabled={!dirty || !valid || working} onClick={save}>
                        Guardar
                    </PanelButton>
                </div>
            </header>

            <div className="mt-8 flex flex-col gap-6 @7xl/main:flex-row">
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                    <PanelSection title="Horas semanales" description="Elegí en qué horario atendés cada día.">
                        <FormProvider {...form}>
                            <ScheduleComponent weekStart={preferences.weekStart} timeFormat={preferences.timeFormat} />
                        </FormProvider>
                    </PanelSection>
                    <OverridesSection
                        overrides={draft.overrides}
                        preferences={preferences}
                        busy={working}
                        onChange={(overrides) => setDraft((d) => ({ ...d, overrides }))}
                    />
                </div>
                <aside className="w-full max-w-sm shrink-0 @7xl/main:w-[350px] @7xl/main:max-w-none">
                    <label htmlFor="availability-timezone" className="mb-2 inline-block text-sm font-medium">
                        Zona horaria
                    </label>
                    <TimezoneSelect
                        id="availability-timezone"
                        value={draft.timeZone}
                        onChange={(timeZone) => setDraft((d) => ({ ...d, timeZone }))}
                    />
                </aside>
            </div>

            {leftOutside.review && (
                <LeftOutsideBookingsDialog
                    bookings={leftOutside.review}
                    timeFormat={preferences.timeFormat}
                    pending={leftOutside.isPending}
                    onBack={leftOutside.back}
                    onConfirm={leftOutside.confirm}
                />
            )}
            <PanelConfirm
                open={confirmLeave}
                onOpenChange={setConfirmLeave}
                title="¿Descartar los cambios?"
                description="Tenés cambios sin guardar en estas horas laborables."
                confirmLabel="Descartar"
                cancelLabel="Seguir editando"
                destructive
                onConfirm={onBack}
            />
            <PanelConfirm
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="¿Eliminar estas horas laborables?"
                description={`"${saved.name}" se elimina para siempre.`}
                confirmLabel="Eliminar"
                destructive
                onConfirm={onDelete}
            />
        </div>
    );
}
