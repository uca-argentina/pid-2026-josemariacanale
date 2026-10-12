'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxTrigger } from '@/app/_components/ui/combobox';

type Option = { id: number; name: string };

/**
 * Un filtro por id (Servicio, Sucursal, Empleado): "+ Filtro" abre un Combobox con buscador y, elegido, queda un chip que
 * se saca. `label` es el nombre del filtro ("Servicio"); `selected` es el id de la URL, y el chip lleva su nombre si
 * está entre las `options`.
 */
export function IdFilter({
    label,
    options,
    selected,
    onChange,
}: {
    label: string;
    options: Option[];
    selected: number | undefined;
    onChange: (id: number | undefined) => void;
}) {
    const current = options.find(({ id }) => id === selected);

    if (selected !== undefined) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent py-1 ps-2 pe-1 text-xs font-medium text-accent-foreground">
                {label}: {current?.name ?? `#${selected}`}
                <Button type="button" variant="ghost" size="icon" className="size-5" aria-label={`Quitar filtro de ${label}`} onClick={() => onChange(undefined)}>
                    <X />
                </Button>
            </span>
        );
    }

    return (
        <Combobox
            items={options}
            value={null}
            onValueChange={(option: Option | null) => option && onChange(option.id)}
            itemToStringLabel={(option: Option) => option.name}
            itemToStringValue={(option: Option) => String(option.id)}
        >
            <ComboboxTrigger render={<Button type="button" variant="outline" size="sm" aria-label={`Agregar filtro de ${label}`} />}>
                <Plus /> {label}
            </ComboboxTrigger>
            <ComboboxPopup align="end" className="w-64">
                <div className="border-b p-2">
                    <ComboboxInput showTrigger={false} placeholder={`Buscar ${label}`} aria-label={`Buscar ${label}`} />
                </div>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                    {(option: Option) => (
                        <ComboboxItem key={option.id} value={option}>
                            {option.name}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}
