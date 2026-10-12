'use client';

import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxTrigger } from '@/app/_components/ui/combobox';
import type { AnalyticsBusiness } from '@/src/entities/models/analytics';

/** El selector de Negocio de Analíticas: un Combobox con buscador sobre los Negocios del Usuario. `selected` es el elegido. */
export function BusinessSelect({
    businesses,
    selected,
    onChange,
}: {
    businesses: AnalyticsBusiness[];
    selected: AnalyticsBusiness | undefined;
    onChange: (businessId: number) => void;
}) {
    return (
        <Combobox
            items={businesses}
            value={selected ?? null}
            onValueChange={(business: AnalyticsBusiness | null) => business && onChange(business.id)}
            itemToStringLabel={(business: AnalyticsBusiness) => business.name}
            itemToStringValue={(business: AnalyticsBusiness) => String(business.id)}
            isItemEqualToValue={(a: AnalyticsBusiness, b: AnalyticsBusiness) => a.id === b.id}
        >
            <ComboboxTrigger render={<Button type="button" variant="outline" className="w-56 justify-between" aria-label="Negocio" />}>
                <span className="truncate">{selected?.name ?? 'Elegí un Negocio'}</span>
                <ChevronsUpDown className="opacity-60" />
            </ComboboxTrigger>
            <ComboboxPopup align="start" className="w-64">
                <div className="border-b p-2">
                    <ComboboxInput showTrigger={false} placeholder="Buscar Negocio" aria-label="Buscar Negocio" />
                </div>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                    {(business: AnalyticsBusiness) => (
                        <ComboboxItem key={business.id} value={business}>
                            {business.name}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}
