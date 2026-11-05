import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PanelBadge } from '@/app/(app)/_components/panel-ui';

export type BusinessRole = 'owner' | 'employee';

export function RoleBadge({ role }: { role: BusinessRole }) {
    return role === 'owner' ? (
        <PanelBadge className="bg-[#e0e7ff] text-[#3730a3]">Dueño</PanelBadge>
    ) : (
        <PanelBadge>Empleado</PanelBadge>
    );
}

/** Encabezado de las páginas de Negocios, con el look de Servicios. */
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
