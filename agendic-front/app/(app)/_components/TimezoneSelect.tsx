'use client';

import { Combobox } from '@base-ui/react/combobox';
import dayjs from 'dayjs';
import timezonePlugin from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo } from 'react';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

/** Ciudades y nombres comunes que se buscan además del nombre de la zona. */
const SEARCH_DATA: { label: string; timezone: string }[] = [
    { label: 'San Francisco', timezone: 'America/Los_Angeles' },
    { label: 'Sao Francisco do Sul', timezone: 'America/Sao_Paulo' },
    { label: 'San Francisco de Macoris', timezone: 'America/Santo_Domingo' },
    { label: 'San Francisco Gotera', timezone: 'America/El_Salvador' },
    { label: 'Eastern Time - US & Canada', timezone: 'America/New_York' },
    { label: 'Pacific Time - US & Canada', timezone: 'America/Los_Angeles' },
    { label: 'Central Time - US & Canada', timezone: 'America/Chicago' },
    { label: 'Mountain Time - US & Canada', timezone: 'America/Denver' },
    { label: 'Atlantic Time - Canada', timezone: 'America/Halifax' },
    { label: 'Eastern European Time', timezone: 'Europe/Bucharest' },
    { label: 'Central European Time', timezone: 'Europe/Berlin' },
    { label: 'Western European Time', timezone: 'Europe/London' },
    { label: 'Australian Eastern Time', timezone: 'Australia/Sydney' },
    { label: 'Japan Standard Time', timezone: 'Asia/Tokyo' },
    { label: 'India Standard Time', timezone: 'Asia/Kolkata' },
    { label: 'Gulf Standard Time', timezone: 'Asia/Dubai' },
    { label: 'South Africa Standard Time', timezone: 'Africa/Johannesburg' },
    { label: 'Brazil Time', timezone: 'America/Sao_Paulo' },
    { label: 'Hawaii-Aleutian Standard Time', timezone: 'Pacific/Honolulu' },
];

/** Las zonas de `Intl` más las de `SEARCH_DATA`: `Intl` usa nombres viejos (`Asia/Calcutta`) para algunas. */
const ZONES = [...new Set([...Intl.supportedValuesOf('timeZone'), ...SEARCH_DATA.map(({ timezone }) => timezone)])];

const nameOf = (zone: string) => zone.replace(/_/g, ' ');

const offsetOf = (zone: string) =>
    `GMT ${dayjs().tz(zone).format('Z').replace(/^([-+])0(\d)/, '$1$2')}`;

const matches = (zone: string, query: string) => {
    const q = query.trim().toLowerCase();
    return (
        nameOf(zone).toLowerCase().includes(q) ||
        SEARCH_DATA.some(({ label, timezone }) => timezone === zone && label.toLowerCase().includes(q))
    );
};

/**
 * Combobox de zona horaria IANA: se escribe y busca por zona o por ciudad. Ver ADR 0025;
 * `value` y `onChange` llevan el identificador IANA.
 */
export function TimezoneSelect({
    id,
    value,
    onChange,
}: {
    id?: string;
    value: string;
    onChange: (timeZone: string) => void;
}) {
    const items = useMemo(() => (ZONES.includes(value) ? ZONES : [value, ...ZONES]), [value]);

    return (
        <Combobox.Root
            items={items}
            value={value}
            onValueChange={(zone: string | null) => zone && onChange(zone)}
            itemToStringLabel={nameOf}
            filter={matches}
        >
            <div className="relative">
                <Combobox.Input
                    id={id}
                    aria-label="Zona horaria"
                    placeholder="Elegí una zona horaria"
                    className="h-9 w-full rounded-md border border-[#d1d5db] bg-white pr-9 pl-3 text-[13.5px] font-medium text-[#0f1b2d] transition-colors outline-none placeholder:text-[#9ca3af] hover:border-[#9ca3af] focus:border-[#0f1b2d] focus:ring-1 focus:ring-[#0f1b2d]"
                />
                <Combobox.Trigger
                    aria-label="Ver zonas horarias"
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[#0f1b2d]"
                >
                    <ChevronsUpDown className="size-4" />
                </Combobox.Trigger>
            </div>
            <Combobox.Portal>
                <Combobox.Positioner sideOffset={4} className="z-50 outline-none">
                    <Combobox.Popup className="w-(--anchor-width) rounded-md border border-[#e5e7eb] bg-white p-1 text-sm shadow-[0_10px_30px_rgba(15,27,45,0.12)]">
                        <Combobox.Empty className="flex h-12 items-center justify-center text-[#6b7280] empty:hidden">
                            Sin resultados.
                        </Combobox.Empty>
                        <Combobox.List className="max-h-[min(240px,var(--available-height))] overflow-y-auto empty:hidden">
                            {(zone: string) => (
                                <Combobox.Item
                                    key={zone}
                                    value={zone}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-[#0f1b2d] outline-none data-[highlighted]:bg-[#f3f4f6] data-[selected]:font-semibold"
                                >
                                    <span className="truncate">{nameOf(zone)}</span>
                                    <span className="ml-auto shrink-0 text-xs text-[#6b7280]">{offsetOf(zone)}</span>
                                    <Combobox.ItemIndicator>
                                        <Check className="size-4" />
                                    </Combobox.ItemIndicator>
                                </Combobox.Item>
                            )}
                        </Combobox.List>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    );
}
