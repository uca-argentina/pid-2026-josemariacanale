'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Clock, Plus } from 'lucide-react';
import { TimezoneSelect } from '@/app/(app)/_components/TimezoneSelect';
import { newOutOfOfficePath } from '@/app/routes';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import type { Availability } from '@/src/entities/models/availability';
import type { Preferences } from '@/src/entities/models/user';
import { AvailabilityListItem } from './AvailabilityListItem';

/** Diálogo de "+ Nuevo": nombre y zona horaria; las Franjas se cargan después, en el editor. */
function NewAvailabilityDialog({
    open,
    onOpenChange,
    onCreate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string, timeZone: string) => Promise<boolean>;
}) {
    const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { isSubmitting },
    } = useForm<{ name: string }>({ defaultValues: { name: '' } });
    const blank = !useWatch({ control, name: 'name' }).trim();
    const defaultTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (isSubmitting) return;
                if (!next) {
                    reset();
                    setTimeZone(defaultTimeZone());
                }
                onOpenChange(next);
            }}
        >
            <DialogContent>
                <form
                    className="grid gap-4"
                    onSubmit={handleSubmit(async ({ name }) => {
                        if (await onCreate(name.trim(), timeZone)) {
                            reset();
                            onOpenChange(false);
                        }
                    })}
                >
                    <DialogHeader>
                        <DialogTitle>Agregar horas laborables</DialogTitle>
                        <DialogDescription>Después cargás las Franjas de cada día.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="new-availability-name">Nombre</Label>
                        <Input
                            id="new-availability-name"
                            autoFocus
                            placeholder="Horario de verano"
                            {...register('name')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="new-availability-time-zone">Zona horaria</Label>
                        <TimezoneSelect id="new-availability-time-zone" value={timeZone} onChange={setTimeZone} />
                    </div>
                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>Cerrar</DialogClose>
                        <Button type="submit" disabled={isSubmitting || blank}>
                            Continuar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Las Horas laborables del Usuario, una fila por cada una con sus Franjas en el formato de hora y desde el
 * primer día de la semana de `preferences`. Cada fila lleva a su editor.
 */
export function AvailabilityList({
    availabilities,
    preferences,
    busy,
    onCreate,
    onMakeDefault,
    onDelete,
}: {
    availabilities: Availability[];
    preferences: Preferences;
    busy: boolean;
    onCreate: (name: string, timeZone: string) => Promise<boolean>;
    onMakeDefault: (availability: Availability) => void;
    onDelete: (availability: Availability) => Promise<unknown>;
}) {
    const [creating, setCreating] = useState(false);

    return (
        <div className="flex-1 bg-background px-4 py-8 text-foreground sm:px-8">
            <header className="flex flex-wrap items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="m-0 text-xl font-extrabold tracking-tight">
                        Horas laborables
                    </h1>
                    <p className="m-0 text-sm text-muted-foreground">
                        Configura los horarios en los que estas dispuesto a
                        recibir turnos.
                    </p>
                </div>
                <Button
                    className="ml-auto"
                    disabled={busy}
                    onClick={() => setCreating(true)}
                >
                    <Plus />
                    Nuevo
                </Button>
            </header>

            <div className="mt-8 overflow-hidden rounded-md border">
                {availabilities.length > 0 ? (
                    <ul className="m-0 list-none divide-y p-0">
                        {availabilities.map((a) => (
                            <AvailabilityListItem
                                key={a.id}
                                availability={a}
                                redirectUrl={`/availability?id=${a.id}`}
                                preferences={preferences}
                                busy={busy}
                                isDeletable={availabilities.length !== 1}
                                updateDefault={() => onMakeDefault(a)}
                                deleteFunction={() => onDelete(a)}
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                        <Clock className="size-8 text-muted-foreground" />
                        <p className="m-0 font-medium">
                            Todavía no tenés horas laborables
                        </p>
                        <p className="m-0 text-sm text-muted-foreground">
                            Agregá unas para empezar a recibir Turnos.
                        </p>
                    </div>
                )}
            </div>

            <p className="mt-4 mb-16 text-center text-sm text-muted-foreground">
                ¿Fuera de la oficina temporalmente?{' '}
                <Link href={newOutOfOfficePath} className="underline">
                    Cargar un período
                </Link>
            </p>

            <NewAvailabilityDialog
                open={creating}
                onOpenChange={setCreating}
                onCreate={onCreate}
            />
        </div>
    );
}
