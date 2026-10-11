'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Clock, Ellipsis, Globe, Plus, Star, Trash2 } from 'lucide-react';
import { TimezoneSelect } from '@/app/(app)/_components/TimezoneSelect';
import { summarizeSchedule } from '@/app/(app)/_components/availability-week';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/_components/ui/alert-dialog';
import { Badge } from '@/app/_components/ui/badge';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/_components/ui/dropdown-menu';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import type { Availability } from '@/src/entities/models/availability';
import type { Preferences } from '@/src/entities/models/user';

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
        watch,
        formState: { isSubmitting },
    } = useForm<{ name: string }>({ defaultValues: { name: '' } });
    const blank = !watch('name').trim();
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

function AvailabilityRow({
    availability,
    preferences,
    busy,
    onOpen,
    onMakeDefault,
    onDelete,
}: {
    availability: Availability;
    preferences: Preferences;
    busy: boolean;
    onOpen: () => void;
    onMakeDefault: () => void;
    onDelete: () => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <li className="flex items-center justify-between gap-2 px-3 py-5 transition-colors hover:bg-muted/50 sm:px-4">
            <button type="button" onClick={onOpen} className="min-w-0 grow rounded-md text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-foreground">{availability.name}</span>
                    {availability.isDefault && <Badge variant="secondary">Predeterminado</Badge>}
                </span>
                <span className="mt-1 block text-muted-foreground">
                    {summarizeSchedule(availability.schedule, preferences).map((line) => (
                        <span key={line} className="block">
                            {line}
                        </span>
                    ))}
                    <span className="my-1 flex items-center gap-1.5 text-xs">
                        <Globe className="size-3.5" />
                        {availability.timeZone}
                    </span>
                </span>
            </button>

            <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon" aria-label="Más acciones" disabled={busy} />}>
                    <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {!availability.isDefault && (
                        <DropdownMenuItem onClick={onMakeDefault}>
                            <Star />
                            Hacer predeterminado
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
                        <Trash2 />
                        Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar estas horas laborables?</AlertDialogTitle>
                        <AlertDialogDescription>{`"${availability.name}" se elimina para siempre.`}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                setConfirmDelete(false);
                                onDelete();
                            }}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </li>
    );
}

/**
 * Las Horas laborables del Usuario: nombre, "Predeterminado", resumen de
 * Franjas en el formato de hora y desde el primer día de la semana de `preferences`, y zona horaria. Abrir
 * una lleva a su editor.
 */
export function AvailabilityList({
    availabilities,
    preferences,
    busy,
    onOpen,
    onCreate,
    onMakeDefault,
    onDelete,
}: {
    availabilities: Availability[];
    preferences: Preferences;
    busy: boolean;
    onOpen: (id: number) => void;
    onCreate: (name: string, timeZone: string) => Promise<boolean>;
    onMakeDefault: (availability: Availability) => void;
    onDelete: (availability: Availability) => void;
}) {
    const [creating, setCreating] = useState(false);

    return (
        <div className="flex-1 bg-background px-4 py-8 text-foreground sm:px-8">
            <header className="flex flex-wrap items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="m-0 text-xl font-extrabold tracking-tight">Horas laborables</h1>
                    <p className="m-0 text-sm text-muted-foreground">Los horarios en los que atendés para recibir Turnos.</p>
                </div>
                <Button className="ml-auto" disabled={busy} onClick={() => setCreating(true)}>
                    <Plus />
                    Nuevo
                </Button>
            </header>

            <div className="mt-8 overflow-hidden rounded-md border">
                {availabilities.length > 0 ? (
                    <ul className="m-0 list-none divide-y p-0">
                        {availabilities.map((a) => (
                            <AvailabilityRow
                                key={a.id}
                                availability={a}
                                preferences={preferences}
                                busy={busy}
                                onOpen={() => onOpen(a.id)}
                                onMakeDefault={() => onMakeDefault(a)}
                                onDelete={() => onDelete(a)}
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                        <Clock className="size-8 text-muted-foreground" />
                        <p className="m-0 font-medium">Todavía no tenés horas laborables</p>
                        <p className="m-0 text-sm text-muted-foreground">Agregá unas para empezar a recibir Turnos.</p>
                    </div>
                )}
            </div>

            <NewAvailabilityDialog open={creating} onOpenChange={setCreating} onCreate={onCreate} />
        </div>
    );
}
