'use client';

import { useState } from 'react';
import { CalendarDays, ChevronsUpDown, Search, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/_components/ui/button';
import {
    Combobox,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
    ComboboxTrigger,
    ComboboxValue,
} from '@/app/_components/ui/combobox';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/app/_components/ui/empty';
import { Switch } from '@/app/_components/ui/switch';
import type { Holiday, HolidayConflict, HolidayCountry, HolidaySettings } from '@/src/entities/models/holiday';
import { setHolidayCountryAction, toggleHolidayAction, type OutOfOfficeActionResult } from '../actions';
import { formatOutOfOfficeDate } from '@/app/_components/format-day';
import { getHolidayEmoji } from './get-holiday-emoji';

/** Lo que la pestaña Días festivos recibe del server: o el mensaje del back (503), o los datos. */
export type HolidaysTabData = { unavailable: string } | { countries: HolidayCountry[]; settings: HolidaySettings; conflicts: HolidayConflict[] };

/** Aviso de Turnos tomados en Días festivos prendidos: "Tenés N Turnos en Días festivos:" y hasta tres con su cantidad. */
function ConflictWarning({ conflicts }: { conflicts: HolidayConflict[] }) {
    const total = conflicts.reduce((sum, { bookings }) => sum + bookings.length, 0);

    return (
        <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <TriangleAlert className="size-4 shrink-0" />
            <p className="m-0 font-medium">
                Tenés {total} {total === 1 ? 'Turno' : 'Turnos'} en Días festivos:
            </p>
            {conflicts.slice(0, 3).map(({ holidayId, holidayName, bookings }, index, shown) => (
                <span key={holidayId}>
                    {holidayName} ({bookings.length})
                    {index < shown.length - 1 && ','}
                </span>
            ))}
            {conflicts.length > 3 && <span className="text-amber-800">+{conflicts.length - 3} más</span>}
        </div>
    );
}

/** Una fila: el emoji en un círculo, el nombre, la fecha y el Switch que prende o apaga el Día festivo. */
function HolidayRow({ holiday, busy, onToggle }: { holiday: Holiday; busy: boolean; onToggle: (enabled: boolean) => void }) {
    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">{getHolidayEmoji(holiday.name)}</div>
            <div className={`flex min-w-0 flex-col ${holiday.enabled ? '' : 'text-muted-foreground'}`}>
                <p className="m-0 truncate text-sm font-bold">{holiday.name}</p>
                <p className="m-0 text-sm text-muted-foreground">{formatOutOfOfficeDate(holiday.date)}</p>
            </div>
            <Switch
                className="ml-auto"
                aria-label={`${holiday.name}: ${holiday.enabled ? 'apagar' : 'prender'}`}
                checked={holiday.enabled}
                disabled={busy}
                onCheckedChange={onToggle}
            />
        </li>
    );
}

/**
 * La pestaña Días festivos: el país del Usuario (Combobox con buscador y "Borrar" al pie, que lo saca), sus Días festivos con un Switch cada
 * uno y, arriba, el aviso de Turnos en Días festivos prendidos. Cada cambio es una acción de servidor que
 * refresca la página, así los conflictos se vuelven a pedir. Con `unavailable` (503) muestra ese mensaje.
 */
export function HolidaysTab({ data }: { data: HolidaysTabData }) {
    const [busy, setBusy] = useState(false);
    const [countryOpen, setCountryOpen] = useState(false);

    if ('unavailable' in data) {
        return <p className="mt-8 rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">{data.unavailable}</p>;
    }

    const { countries, settings, conflicts } = data;
    const selected = countries.find(({ code }) => code === settings.countryCode) ?? null;

    const apply = async (run: () => Promise<OutOfOfficeActionResult>) => {
        setBusy(true);
        const result = await run();
        setBusy(false);
        if (result.ok) toast.success('Configuración de días festivos actualizada');
        else toast.error(result.message);
    };

    return (
        <div className="mt-8 flex flex-col gap-4">
            {conflicts.length > 0 && <ConflictWarning conflicts={conflicts} />}
            <section className="flex flex-col gap-4 rounded-md border bg-muted/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="m-0 text-base font-semibold">Días festivos</h2>
                    <Combobox
                        items={countries}
                        value={selected}
                        onValueChange={(country: HolidayCountry | null) =>
                            apply(() => setHolidayCountryAction({ countryCode: country?.code ?? null }))
                        }
                        itemToStringLabel={(country: HolidayCountry) => country.name}
                        itemToStringValue={(country: HolidayCountry) => country.code}
                        disabled={busy}
                        open={countryOpen}
                        onOpenChange={setCountryOpen}
                    >
                        <ComboboxTrigger
                            aria-label="País"
                            render={<Button type="button" variant="outline" className="w-64 justify-between font-normal" />}
                        >
                            <ComboboxValue>
                                {(country: HolidayCountry | null) =>
                                    country ? (
                                        <span className="truncate">{country.name}</span>
                                    ) : (
                                        <span className="text-muted-foreground">Seleccionar país</span>
                                    )
                                }
                            </ComboboxValue>
                            <ChevronsUpDown className="text-muted-foreground" />
                        </ComboboxTrigger>
                        <ComboboxPopup align="end" className="w-64">
                            <div className="border-b p-2">
                                <ComboboxInput showTrigger={false} startAddon={<Search />} placeholder="Buscar" aria-label="Buscar país" />
                            </div>
                            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                            <ComboboxList>
                                {(country: HolidayCountry) => (
                                    <ComboboxItem key={country.code} value={country}>
                                        <span className="me-1.5 text-xs text-muted-foreground">{country.code}</span>
                                        {country.name}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                            <div className="border-t p-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    disabled={!selected}
                                    onClick={() => {
                                        setCountryOpen(false);
                                        apply(() => setHolidayCountryAction({ countryCode: null }));
                                    }}
                                >
                                    Borrar
                                </Button>
                            </div>
                        </ComboboxPopup>
                    </Combobox>
                </div>

                {selected ? (
                    <ul className="m-0 list-none divide-y overflow-hidden rounded-md border bg-background p-0">
                        {settings.holidays.map((holiday) => (
                            <HolidayRow
                                key={holiday.id}
                                holiday={holiday}
                                busy={busy}
                                onToggle={(enabled) => apply(() => toggleHolidayAction({ holidayId: holiday.id, enabled }))}
                            />
                        ))}
                    </ul>
                ) : (
                    <Empty className="rounded-md bg-background">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CalendarDays />
                            </EmptyMedia>
                            <EmptyTitle>No hay días festivos seleccionados</EmptyTitle>
                            <EmptyDescription>Seleccioná un país para ver los Días festivos disponibles.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </section>
        </div>
    );
}
