'use client';

import { cn } from '@/app/_components/utils';

/**
 * Barra de chips para filtrar por Categoría de Servicio. El chip activo va en tinta llena.
 * No usa el primitivo Tabs: ese trae fondo, `flex-1` y subrayado propios que habría que deshacer.
 */
export function ChipTabs<T extends string>({
    options,
    value,
    onSelect,
    label,
}: {
    options: readonly { value: T; label: string }[];
    value: T;
    onSelect: (value: T) => void;
    label: string;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onSelect(o.value)}
                        aria-pressed={active}
                        className={cn(
                            'shrink-0 rounded-full px-5 py-2.5 text-[14px] font-bold tracking-[-0.01em] whitespace-nowrap transition-colors',
                            active ? 'bg-foreground text-white' : 'text-foreground hover:bg-muted',
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}
