'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover } from 'radix-ui';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/app/_components/ui/command';
import { cn } from '@/app/_components/utils';
import { FIELD_BOX } from './panel-ui';

const ZONES = Intl.supportedValuesOf('timeZone');

/**
 * Elige una zona horaria IANA escribiendo para buscar. Si la actual no está en la lista del navegador
 * (por ejemplo `UTC`), se suma.
 */
export function TimeZoneCombobox({
    id,
    value,
    onChange,
    placeholder = 'Elegí una zona horaria',
}: {
    id?: string;
    value: string;
    onChange: (timeZone: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const zones = !value || ZONES.includes(value) ? ZONES : [value, ...ZONES];

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
                id={id}
                role="combobox"
                aria-expanded={open}
                className={cn(FIELD_BOX, 'justify-between px-3 text-left')}
            >
                <span className={cn('truncate', !value && 'text-[#9ca3af]')}>{value || placeholder}</span>
                <ChevronDown className="size-4 shrink-0 text-[#0f1b2d]" />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="start"
                    sideOffset={4}
                    className="z-50 w-(--radix-popover-trigger-width) rounded-md border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(15,27,45,0.12)] outline-none"
                >
                    <Command>
                        <CommandInput placeholder="Buscar zona horaria" />
                        {/* El wheel no sube al diálogo (react-remove-scroll lo bloquea fuera de su contenido). */}
                        <CommandList className="p-1" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Sin resultados.</CommandEmpty>
                            {zones.map((zone) => (
                                <CommandItem
                                    key={zone}
                                    value={zone}
                                    data-checked={zone === value}
                                    keywords={[zone.replaceAll('_', ' ')]}
                                    onSelect={() => {
                                        onChange(zone);
                                        setOpen(false);
                                    }}
                                >
                                    {zone}
                                </CommandItem>
                            ))}
                        </CommandList>
                    </Command>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
