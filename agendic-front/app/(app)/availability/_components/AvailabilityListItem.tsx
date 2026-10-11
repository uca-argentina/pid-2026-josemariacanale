'use client';

import Link from 'next/link';
import { Fragment, useState, useTransition } from 'react';
import { CircleAlert, Ellipsis, Globe, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { intervalAsString, intervalsFromSchedule, sortIntervalStrings } from '@/app/(app)/_components/availability-week';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/app/_components/ui/alert-dialog';
import { Badge } from '@/app/_components/ui/badge';
import { Button } from '@/app/_components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/_components/ui/dropdown-menu';
import type { Availability } from '@/src/entities/models/availability';
import type { Preferences } from '@/src/entities/models/user';

/**
 * Una fila de la lista de Horas laborables: nombre, "Predeterminado", una línea por Franja y la zona
 * horaria; lleva a `redirectUrl`. El menú ⋯ la hace predeterminada o la elimina, con confirmación.
 *
 * @param preferences formato de hora y primer día de la semana del Usuario, para las Franjas
 * @param busy otra acción de Horas laborables está en curso: el menú no abre
 * @param isDeletable si no es la única: eliminar la última avisa sin preguntar
 * @param deleteFunction la confirmación queda abierta hasta que termina
 */
export function AvailabilityListItem({
    availability,
    deleteFunction,
    preferences,
    busy,
    updateDefault,
    isDeletable,
    redirectUrl,
}: {
    availability: Availability;
    deleteFunction: () => Promise<unknown>;
    preferences: Preferences;
    busy: boolean;
    isDeletable: boolean;
    updateDefault: () => void;
    redirectUrl: string;
}) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    return (
        <li>
            <div className="flex items-center justify-between px-3 py-5 transition hover:bg-muted @xl/main:px-4">
                <Link href={redirectUrl} className="grow truncate text-sm" title={availability.name}>
                    <div className="space-x-2">
                        <span className="truncate font-medium text-foreground">{availability.name}</span>
                        {availability.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                                Predeterminado
                            </Badge>
                        )}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                        {intervalsFromSchedule(availability.schedule)
                            .map((interval) => intervalAsString(interval, { hour12: preferences.timeFormat === 12 }))
                            .sort(sortIntervalStrings(preferences.weekStart))
                            .map((intervalString) => (
                                <Fragment key={intervalString}>
                                    {intervalString}
                                    <br />
                                </Fragment>
                            ))}
                        <span className="my-1 flex items-center first-letter:text-xs">
                            <Globe className="h-3.5 w-3.5" />
                            &nbsp;{availability.timeZone}
                        </span>
                    </p>
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon" aria-label="Más acciones" disabled={busy} />}>
                        <Ellipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!availability.isDefault && (
                            <DropdownMenuItem className="min-w-40" onClick={updateDefault}>
                                <Star />
                                Hacer predeterminado
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            className="min-w-40 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 data-highlighted:bg-destructive/10"
                            onClick={() => {
                                if (!isDeletable) {
                                    toast.error('Tenés que tener al menos unas horas laborables');
                                } else {
                                    setIsDeleteDialogOpen(true);
                                }
                            }}
                        >
                            <Trash2 />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !isPending && setIsDeleteDialogOpen(open)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogMedia className="rounded-full bg-destructive/10">
                                <CircleAlert className="text-destructive" />
                            </AlertDialogMedia>
                            <AlertDialogTitle>Eliminar horas laborables</AlertDialogTitle>
                            <AlertDialogDescription>
                                {`"${availability.name}" se elimina para siempre. Esta acción no se puede deshacer.`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isPending}
                                onClick={() =>
                                    startTransition(async () => {
                                        await deleteFunction();
                                        setIsDeleteDialogOpen(false);
                                    })
                                }
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </li>
    );
}
