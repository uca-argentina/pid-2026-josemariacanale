'use client';

import { useId, useState } from 'react';
import { Popover } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import { TIME_OPTIONS } from './availability-week';
import { FIELD_BOX } from './panel-ui';

/**
 * Autocomplete de hora `HH:mm` sobre `TIME_OPTIONS` (cada 15 minutos).
 *
 * Solo emite valores de la lista: lo escrito que no coincide con ninguna opción se descarta al salir del campo.
 */
export function TimeSelect({
    value,
    onChange,
    id,
    placeholder,
    invalid,
    className,
    'aria-label': ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    id?: string;
    placeholder?: string;
    invalid?: boolean;
    className?: string;
    'aria-label'?: string;
}) {
    const listId = useId();
    const [typed, setTyped] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const options = typed ? TIME_OPTIONS.filter((t) => t.includes(typed)) : TIME_OPTIONS;

    const show = () => {
        if (open) return;
        setActive(Math.max(0, options.indexOf(value)));
        setOpen(true);
    };
    const pick = (time: string) => {
        onChange(time);
        setTyped(null);
        setOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) return show();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((a) => Math.min(Math.max(a + step, 0), options.length - 1));
        } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            if (options[active]) pick(options[active]);
        }
    };

    return (
        <Popover.Root open={open && options.length > 0} onOpenChange={setOpen}>
            <Popover.Anchor asChild>
                <div className={cn(FIELD_BOX, invalid && 'border-[#b91c1c] hover:border-[#b91c1c]', className)}>
                    <input
                        id={id}
                        role="combobox"
                        aria-label={ariaLabel}
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-invalid={invalid || undefined}
                        aria-autocomplete="list"
                        autoComplete="off"
                        placeholder={placeholder}
                        value={typed ?? value}
                        onChange={(e) => {
                            setTyped(e.target.value);
                            setActive(0);
                            setOpen(true);
                        }}
                        onFocus={show}
                        onClick={show}
                        onKeyDown={onKeyDown}
                        onBlur={() => {
                            if (typed && TIME_OPTIONS.includes(typed)) onChange(typed);
                            setTyped(null);
                            setOpen(false);
                        }}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-[#9ca3af]"
                    />
                    <ChevronDown className="mr-3 size-4 shrink-0 text-[#0f1b2d]" />
                </div>
            </Popover.Anchor>
            <Popover.Portal>
                <Popover.Content
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="z-50 max-h-[min(288px,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) overflow-y-auto rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0_10px_30px_rgba(15,27,45,0.12)]"
                >
                    <div role="listbox" id={listId}>
                        {options.map((time, i) => (
                            <div
                                key={time}
                                role="option"
                                aria-selected={time === value}
                                ref={(el) => {
                                    if (i === active) el?.scrollIntoView({ block: 'nearest' });
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => pick(time)}
                                className={cn(
                                    'flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[13.5px] font-medium text-[#0f1b2d]',
                                    i === active && 'bg-[#f3f4f6]',
                                )}
                            >
                                {time}
                                {time === value && <Check className="ml-auto size-4" />}
                            </div>
                        ))}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
