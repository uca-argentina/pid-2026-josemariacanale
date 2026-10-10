import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PanelAvatar, PanelBadge } from '@/app/(app)/_components/panel-ui';
import { bookingLink } from '@/app/(app)/_components/mock-services';

export type BusinessRole = 'owner' | 'employee';

export function RoleBadge({ role }: { role: BusinessRole }) {
    return role === 'owner' ? (
        <PanelBadge className="bg-[#e0e7ff] text-[#3730a3]">Dueño</PanelBadge>
    ) : (
        <PanelBadge>Empleado</PanelBadge>
    );
}

/** Encabezado de las páginas de Mi Negocio, con el look de Servicios. */
export function PageHeader({
    title,
    description,
    backHref,
    backLabel,
}: {
    title: string;
    description: string;
    backHref?: string;
    backLabel?: string;
}) {
    return (
        <header className="flex items-start gap-3">
            {backHref && (
                <Link
                    href={backHref}
                    aria-label={backLabel}
                    className="rounded-md p-1.5 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#0f1b2d]"
                >
                    <ArrowLeft className="size-5" />
                </Link>
            )}
            <div className="flex min-w-0 flex-col gap-1">
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">{title}</h1>
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">{description}</p>
            </div>
        </header>
    );
}

/** El Negocio con su Enlace de reserva y el rol del Usuario; `children` va en una franja gris abajo. */
export function BusinessCard({
    business,
    role,
    actions,
    children,
}: {
    business: { name: string; slug: string; logoUrl?: string | null };
    role: BusinessRole;
    actions?: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex flex-wrap items-center gap-3 px-6 py-5">
                <PanelAvatar name={business.name} imageUrl={business.logoUrl} />
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[14.5px] font-bold tracking-[-0.02em]">{business.name}</span>
                    <span className="truncate text-[12.5px] font-medium text-[#6b7280]">{bookingLink(business.slug)}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <RoleBadge role={role} />
                    {actions}
                </div>
            </div>
            {children && <div className="border-t border-[#e5e7eb] bg-[#f3f4f6] px-6 py-6">{children}</div>}
        </section>
    );
}
