'use client';

import dayjs from 'dayjs';
import timezonePlugin from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useCallback, useId, useMemo, useState } from 'react';
import type { ITimezoneOption } from 'react-timezone-select';
import BaseSelect from 'react-timezone-select';
import { cn } from '@/app/_components/utils';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

type Timezones = { label: string; timezone: string }[];

/** Zonas que `react-timezone-select` no resuelve bien (spacetime#323, timezone-soft#17). */
const PROBLEMATIC = new Set([
    'null',
    'Africa/Malabo',
    'Africa/Maseru',
    'Africa/Mbabane',
    'America/Anguilla',
    'America/Antigua',
    'America/Aruba',
    'America/Bahia',
    'America/Cayman',
    'America/Dominica',
    'America/Grenada',
    'America/Guadeloupe',
    'America/Kralendijk',
    'America/Lower_Princes',
    'America/Maceio',
    'America/Marigot',
    'America/Montserrat',
    'America/Nassau',
    'America/St_Barthelemy',
    'America/St_Kitts',
    'America/St_Lucia',
    'America/St_Thomas',
    'America/St_Vincent',
    'America/Tortola',
    'Antarctica/McMurdo',
    'Arctic/Longyearbyen',
    'Asia/Bahrain',
    'Atlantic/St_Helena',
    'Europe/Busingen',
    'Europe/Guernsey',
    'Europe/Isle_of_Man',
    'Europe/Mariehamn',
    'Europe/San_Marino',
    'Europe/Vaduz',
    'Europe/Vatican',
    'Indian/Comoro',
    'Pacific/Saipan',
    'Africa/Asmara',
]);

/** Ciudades y nombres comunes que se buscan además de la lista de `react-timezone-select`. */
const SEARCH_DATA: Timezones = [
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

/** `react-timezone-select` capitaliza mal estos identificadores IANA. */
const CORRECTIONS: Record<string, string> = {
    'America/Port_Of_Spain': 'America/Port_of_Spain',
    'Africa/Porto-novo': 'Africa/Porto-Novo',
    'Africa/Dar_Es_Salaam': 'Africa/Dar_es_Salaam',
};

const filterBySearchText = (searchText: string, timezones: Timezones) =>
    timezones.filter(({ label }) => searchText && label.toLowerCase().includes(searchText.toLowerCase()));

const addTimezonesToDropdown = (timezones: Timezones) =>
    Object.fromEntries(
        timezones.filter(({ timezone }) => !PROBLEMATIC.has(timezone)).map(({ label, timezone }) => [timezone, label]),
    );

const formatOffset = (offset: string) => offset.replace(/^([-+])(0)(\d):00$/, (_, sign, _zero, hour) => `${sign}${hour}:00`);

const optionLabel = (option: ITimezoneOption, timezones: Timezones) => {
    const offsetUnit = option.label.split(/[-+]/)[0].substring(1);
    const cityName = option.label.split(') ')[1];
    const suffix = ` ${offsetUnit} ${formatOffset(dayjs.tz(undefined, option.value).format('Z'))}`;
    return timezones.length > 0 ? `${cityName}${suffix}` : `${option.value.replace(/_/g, ' ')}${suffix}`;
};

/**
 * Elige una zona horaria IANA buscando por ciudad o zona. Ver ADR 0025;
 * `value` y `onChange` llevan el identificador IANA, como el combobox que reemplaza.
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
    // Una zona puede tener varias etiquetas ('San Francisco' y 'Pacific Time'): se buscan todas.
    const [additionalTimezones, setAdditionalTimezones] = useState<Timezones>([]);
    const instanceId = useId();

    const timezones = useMemo(
        () => ({ ...addTimezonesToDropdown(SEARCH_DATA), ...addTimezonesToDropdown(additionalTimezones) }),
        [additionalTimezones],
    );

    const getLabel = useCallback(
        (option: unknown) => optionLabel(option as ITimezoneOption, additionalTimezones),
        [additionalTimezones],
    );

    return (
        <BaseSelect
            instanceId={instanceId}
            inputId={id}
            value={value}
            timezones={timezones}
            aria-label="Zona horaria"
            placeholder="Elegí una zona horaria"
            noOptionsMessage={() => 'Sin resultados.'}
            onInputChange={(text) => setAdditionalTimezones(filterBySearchText(text, SEARCH_DATA))}
            onChange={(option: ITimezoneOption | null) => option && onChange(CORRECTIONS[option.value] ?? option.value)}
            formatOptionLabel={(option: unknown) => (
                <p className="truncate">{(option as ITimezoneOption).value.replace(/_/g, ' ')}</p>
            )}
            getOptionLabel={getLabel}
            className="w-full"
            classNames={{
                control: (state) =>
                    cn(
                        'h-9 rounded-md border border-[#d1d5db] bg-white px-3 text-[13.5px] font-medium text-[#0f1b2d] transition-colors',
                        state.isFocused ? 'border-[#0f1b2d] ring-1 ring-[#0f1b2d]' : 'hover:border-[#9ca3af]',
                    ),
                singleValue: () => 'text-[#0f1b2d]',
                placeholder: () => 'text-[#9ca3af]',
                dropdownIndicator: () => 'text-[#0f1b2d]',
                menuList: () => 'max-h-[180px] overflow-y-auto',
                menu: () =>
                    'z-50 mt-1 rounded-md border border-[#e5e7eb] bg-white p-1 text-sm shadow-[0_10px_30px_rgba(15,27,45,0.12)]',
                option: (state) =>
                    cn(
                        'rounded-md px-3 py-2.5 text-[#0f1b2d]',
                        state.isFocused && 'bg-[#f3f4f6]',
                        state.isSelected && 'bg-[#e5e7eb]',
                    ),
                noOptionsMessage: () => 'flex h-12 items-center justify-center py-2 text-[#6b7280]',
            }}
            unstyled
        />
    );
}
