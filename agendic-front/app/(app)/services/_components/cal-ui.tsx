'use client';

import { AlertDialog, Dialog, DropdownMenu, Select, Switch } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/app/_components/utils';

// Primitivos con el look de cal.com (Event Types). Locales a /services a propósito: si el look se adopta
// en el resto de la app, se promueven a app/_components/ui/ reemplazando los actuales.

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-1';

const BUTTON_VARIANTS = {
    primary: 'bg-[#0f1b2d] text-white shadow-[0_1px_2px_rgba(15,27,45,0.25)] hover:bg-[#1c2b44] disabled:bg-[#d1d5db] disabled:text-white disabled:shadow-none',
    secondary: 'border border-[#e5e7eb] bg-white text-[#0f1b2d] hover:bg-[#f3f4f6]',
    ghost: 'text-[#374151] hover:bg-[#f3f4f6] hover:text-[#0f1b2d]',
    destructive: 'border border-[#e5e7eb] bg-white text-[#b91c1c] hover:bg-[#fef2f2]',
};

export function CalButton({
    variant = 'primary',
    className,
    ...props
}: React.ComponentProps<'button'> & { variant?: keyof typeof BUTTON_VARIANTS }) {
    return (
        <button
            type="button"
            className={cn(
                'inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3.5 text-[13px] font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
                FOCUS,
                BUTTON_VARIANTS[variant],
                className,
            )}
            {...props}
        />
    );
}

/** Botones de ícono pegados, con un solo borde y divisores, como las acciones de una fila de cal.com. */
export function CalIconGroup({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex shrink-0 divide-x divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(15,27,45,0.05)]">
            {children}
        </div>
    );
}

export function CalIconButton({
    label,
    destructive,
    className,
    ...props
}: React.ComponentProps<'button'> & { label: string; destructive?: boolean }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={cn(
                'flex size-9 items-center justify-center transition-colors hover:bg-[#f3f4f6] [&_svg]:size-4',
                destructive ? 'text-[#b91c1c]' : 'text-[#374151]',
                FOCUS,
                'focus-visible:ring-inset focus-visible:ring-offset-0',
                className,
            )}
            {...props}
        />
    );
}

export function CalSwitch({ className, ...props }: React.ComponentProps<typeof Switch.Root>) {
    return (
        <Switch.Root
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#e5e7eb] transition-colors data-[state=checked]:bg-[#0f1b2d] disabled:cursor-not-allowed disabled:opacity-50',
                FOCUS,
                className,
            )}
            {...props}
        >
            <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
    );
}

export function CalBadge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[11.5px] font-bold text-[#0f1b2d] [&_svg]:size-3.5',
                className,
            )}
        >
            {children}
        </span>
    );
}

export function CalCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return <section className={cn('rounded-md border border-[#e5e7eb] bg-white p-6', className)}>{children}</section>;
}

export function CalField({
    label,
    hint,
    htmlFor,
    children,
}: {
    label: string;
    hint?: string;
    htmlFor?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={htmlFor} className="text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">
                {label}
            </label>
            {children}
            {hint && <p className="m-0 text-[12.5px] font-medium text-[#6b7280]">{hint}</p>}
        </div>
    );
}

const FIELD_BOX =
    'flex h-9 w-full items-center rounded-md border border-[#d1d5db] bg-white text-[13.5px] font-medium text-[#0f1b2d] transition-colors hover:border-[#9ca3af] focus-within:border-[#0f1b2d] focus-within:ring-1 focus-within:ring-[#0f1b2d] has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-[#f9fafb] has-[:disabled]:text-[#6b7280] has-[:disabled]:hover:border-[#d1d5db]';

export function CalInput({
    prefix,
    suffix,
    className,
    ...props
}: Omit<React.ComponentProps<'input'>, 'prefix'> & { prefix?: string; suffix?: string }) {
    return (
        <div className={cn(FIELD_BOX, className)}>
            {prefix && <span className="shrink-0 pl-3 text-[#9ca3af] select-none">{prefix}</span>}
            <input
                className={cn(
                    'h-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-[#9ca3af] disabled:cursor-not-allowed',
                    prefix && 'pl-1',
                )}
                {...props}
            />
            {suffix && <span className="shrink-0 pr-3 text-[#9ca3af] select-none">{suffix}</span>}
        </div>
    );
}

export function CalTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            className={cn(
                'min-h-24 w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[13.5px] font-medium leading-relaxed text-[#0f1b2d] transition-colors outline-none placeholder:text-[#9ca3af] hover:border-[#9ca3af] focus:border-[#0f1b2d] focus:ring-1 focus:ring-[#0f1b2d] disabled:cursor-not-allowed disabled:bg-[#f9fafb] disabled:text-[#6b7280]',
                className,
            )}
            {...props}
        />
    );
}

export interface CalOption {
    value: string;
    label: string;
    badge?: string;
}

export function CalSelect({
    id,
    value,
    onValueChange,
    options,
    disabled,
}: {
    id?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: CalOption[];
    disabled?: boolean;
}) {
    return (
        <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
            <Select.Trigger id={id} className={cn(FIELD_BOX, 'justify-between px-3 text-left data-[disabled]:cursor-not-allowed data-[disabled]:bg-[#f9fafb] data-[disabled]:text-[#6b7280]')}>
                <Select.Value />
                <Select.Icon asChild>
                    <ChevronDown className="size-4 text-[#0f1b2d]" />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content
                    position="popper"
                    sideOffset={4}
                    className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0_10px_30px_rgba(15,27,45,0.12)]"
                >
                    <Select.Viewport>
                        {options.map((o) => (
                            <Select.Item
                                key={o.value}
                                value={o.value}
                                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[13.5px] font-medium text-[#0f1b2d] outline-none data-[highlighted]:bg-[#f3f4f6]"
                            >
                                <Select.ItemText>{o.label}</Select.ItemText>
                                {o.badge && (
                                    <span className="rounded bg-[#e0e7ff] px-1.5 py-0.5 text-[11px] font-bold text-[#3730a3]">
                                        {o.badge}
                                    </span>
                                )}
                                <Select.ItemIndicator className="ml-auto">
                                    <Check className="size-4" />
                                </Select.ItemIndicator>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}

export function CalDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer: React.ReactNode;
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-[#0f1b2d]/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_rgba(15,27,45,0.25)] outline-none">
                    <div className="flex flex-col gap-6 overflow-y-auto px-8 pt-8 pb-10">
                        <div className="flex flex-col gap-1">
                            <Dialog.Title className="m-0 text-[21px] font-extrabold tracking-[-0.035em] text-[#0f1b2d]">
                                {title}
                            </Dialog.Title>
                            {description && (
                                <Dialog.Description className="m-0 text-[13px] font-medium text-[#6b7280]">{description}</Dialog.Description>
                            )}
                        </div>
                        {children}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-[#e5e7eb] bg-[#f9fafb] px-8 py-4">{footer}</div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function CalDialogClose({ children }: { children: React.ReactNode }) {
    return <Dialog.Close asChild>{children}</Dialog.Close>;
}

export function CalConfirm({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancelar',
    destructive,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    /** Sin `confirmLabel` es un aviso: solo queda el botón de cancelar. */
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm?: () => void;
}) {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[#0f1b2d]/50" />
                <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_rgba(15,27,45,0.25)] outline-none">
                    <div className="flex flex-col gap-2 px-8 pt-8 pb-8">
                        <AlertDialog.Title className="m-0 text-[19px] font-extrabold tracking-[-0.03em] text-[#0f1b2d]">
                            {title}
                        </AlertDialog.Title>
                        <AlertDialog.Description className="m-0 text-[13px] font-medium leading-relaxed text-[#6b7280]">
                            {description}
                        </AlertDialog.Description>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-[#e5e7eb] bg-[#f9fafb] px-8 py-4">
                        <AlertDialog.Cancel asChild>
                            <CalButton variant={confirmLabel ? 'ghost' : 'primary'}>{cancelLabel}</CalButton>
                        </AlertDialog.Cancel>
                        {confirmLabel && (
                            <AlertDialog.Action asChild>
                                <CalButton
                                    onClick={onConfirm}
                                    className={cn(destructive && 'bg-[#b91c1c] hover:bg-[#991b1b]')}
                                >
                                    {confirmLabel}
                                </CalButton>
                            </AlertDialog.Action>
                        )}
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}

export interface CalMenuItem {
    label: string;
    icon: React.ReactNode;
    destructive?: boolean;
    disabled?: boolean;
    onSelect?: () => void;
}

export function CalMenu({ trigger, items }: { trigger: React.ReactNode; items: CalMenuItem[] }) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    className="z-50 min-w-[180px] rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0_10px_30px_rgba(15,27,45,0.12)]"
                >
                    {items.map((item) => (
                        <DropdownMenu.Item
                            key={item.label}
                            disabled={item.disabled}
                            onSelect={item.onSelect}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[13px] font-semibold outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-[#f3f4f6] [&_svg]:size-4',
                                item.destructive ? 'text-[#b91c1c]' : 'text-[#0f1b2d]',
                            )}
                        >
                            {item.icon}
                            {item.label}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
