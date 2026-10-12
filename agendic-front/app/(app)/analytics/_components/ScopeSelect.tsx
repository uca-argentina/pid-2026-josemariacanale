'use client';

import { Check, ChevronDown } from 'lucide-react';
import { PanelAvatar } from '@/app/(app)/_components/panel-ui';
import { Button } from '@/app/_components/ui/button';
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxTrigger } from '@/app/_components/ui/combobox';
import { cn } from '@/app/_components/utils';
import type { AnalyticsBusiness } from '@/src/entities/models/analytics';

/** De quién son las analíticas: el Usuario (`id: undefined`, sus Servicios personales) o un Negocio del que es Empleado. */
type Scope = { id: number | undefined; name: string; imageUrl: string | null };

/**
 * El selector de Analíticas, como el de Cal.com Insights: un Combobox con buscador y, en cada opción, avatar y check.
 * Primero el Usuario, con su foto; después los Negocios de los que es Empleado. `selected` es el `businessId` elegido.
 * El check propio de `ComboboxItem` (a la izquierda) se esconde: el de Cal.com va a la derecha.
 */
export function ScopeSelect({
    user,
    businesses,
    selected,
    onChange,
}: {
    user: { name: string; imageUrl: string | null };
    businesses: AnalyticsBusiness[];
    selected: number | undefined;
    onChange: (businessId: number | undefined) => void;
}) {
    const scopes: Scope[] = [{ id: undefined, ...user }, ...businesses.map(({ id, name }) => ({ id, name, imageUrl: null }))];
    const current = scopes.find(({ id }) => id === selected) ?? scopes[0];

    return (
        <Combobox
            items={scopes}
            value={current}
            onValueChange={(scope: Scope | null) => scope && onChange(scope.id)}
            itemToStringLabel={(scope: Scope) => scope.name}
            itemToStringValue={(scope: Scope) => String(scope.id ?? 'me')}
            isItemEqualToValue={(a: Scope, b: Scope) => a.id === b.id}
        >
            <ComboboxTrigger render={<Button type="button" variant="outline" className="max-w-64 justify-between gap-2" aria-label="Ver analíticas de" />}>
                <PanelAvatar name={current.name} imageUrl={current.imageUrl} className="size-5 text-[8px]" />
                <span className="truncate">{current.name}</span>
                <ChevronDown className="opacity-60" />
            </ComboboxTrigger>
            <ComboboxPopup align="start" className="w-72">
                <div className="border-b p-2">
                    <ComboboxInput showTrigger={false} placeholder="Buscar" aria-label="Buscar" />
                </div>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                    {(scope: Scope) => (
                        <ComboboxItem key={scope.id ?? 'me'} value={scope} className="flex py-2 pe-2 [&>span]:hidden">
                            <div className="flex w-full items-center gap-2">
                                <PanelAvatar name={scope.name} imageUrl={scope.imageUrl} className="size-6" />
                                <span className="min-w-0 flex-1 truncate">{scope.name}</span>
                                <span
                                    aria-hidden
                                    className={cn(
                                        'flex size-4 items-center justify-center rounded-[4px] border',
                                        scope.id === current.id && 'border-foreground bg-foreground text-background',
                                    )}
                                >
                                    {scope.id === current.id && <Check className="size-3" />}
                                </span>
                            </div>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}
