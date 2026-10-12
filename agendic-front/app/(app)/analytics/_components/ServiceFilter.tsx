'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxTrigger } from '@/app/_components/ui/combobox';
import type { PersonalAnalyticsData } from '../actions';

type Service = PersonalAnalyticsData['services'][number];

/**
 * El filtro por Servicio: "+ Filtro" abre un Combobox con buscador y, elegido, queda un chip que se saca. `selected`
 * es el `serviceId` de la URL; el chip lleva su nombre si el Servicio está entre las `services`.
 */
export function ServiceFilter({
    services,
    selected,
    onChange,
}: {
    services: Service[];
    selected: number | undefined;
    onChange: (serviceId: number | undefined) => void;
}) {
    const current = services.find(({ id }) => id === selected);

    if (selected !== undefined) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent py-1 ps-2 pe-1 text-xs font-medium text-accent-foreground">
                Servicio: {current?.name ?? `#${selected}`}
                <Button type="button" variant="ghost" size="icon" className="size-5" aria-label="Quitar filtro de Servicio" onClick={() => onChange(undefined)}>
                    <X />
                </Button>
            </span>
        );
    }

    return (
        <Combobox
            items={services}
            value={null}
            onValueChange={(service: Service | null) => service && onChange(service.id)}
            itemToStringLabel={(service: Service) => service.name}
            itemToStringValue={(service: Service) => String(service.id)}
        >
            <ComboboxTrigger render={<Button type="button" variant="outline" size="sm" aria-label="Agregar filtro" />}>
                <Plus /> Servicio
            </ComboboxTrigger>
            <ComboboxPopup align="end" className="w-64">
                <div className="border-b p-2">
                    <ComboboxInput showTrigger={false} placeholder="Buscar Servicio" aria-label="Buscar Servicio" />
                </div>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                    {(service: Service) => (
                        <ComboboxItem key={service.id} value={service}>
                            {service.name}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}
