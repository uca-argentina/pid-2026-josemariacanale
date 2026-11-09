'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PanelAvatar } from '@/app/(app)/_components/panel-ui';
import { bookingLink } from '@/app/(app)/_components/booking-link';
import { RoleBadge, type BusinessRole } from './business-ui';

/**
 * El Negocio con su Enlace de reserva y el rol del Usuario, colapsable: `children` va en una franja gris que se abre
 * y se cierra. `actions` queda fuera del botón que colapsa, para que sus botones no lo disparen.
 */
export function BusinessCard({
    business,
    role,
    defaultOpen = false,
    actions,
    children,
}: {
    business: { name: string; slug: string; logoUrl?: string | null };
    role: BusinessRole;
    /** Abierto al montar: el Usuario con un solo Negocio lo ve abierto. */
    defaultOpen?: boolean;
    actions?: React.ReactNode;
    children?: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const panelId = useId();

    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex flex-wrap items-center gap-3 px-6 py-5">
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? panelId : undefined}
                    onClick={() => setOpen((value) => !value)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-2"
                >
                    <PanelAvatar name={business.name} imageUrl={business.logoUrl} />
                    <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[14.5px] font-bold tracking-[-0.02em]">{business.name}</span>
                        <span className="truncate text-[12.5px] font-medium text-[#6b7280]">{bookingLink(business.slug)}</span>
                    </span>
                    <ChevronDown className={`ml-auto size-4 shrink-0 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                <div className="flex items-center gap-3">
                    <RoleBadge role={role} />
                    {actions}
                </div>
            </div>
            {children && open && (
                <div id={panelId} className="border-t border-[#e5e7eb] bg-[#f3f4f6] px-6 py-6">
                    {children}
                </div>
            )}
        </section>
    );
}
