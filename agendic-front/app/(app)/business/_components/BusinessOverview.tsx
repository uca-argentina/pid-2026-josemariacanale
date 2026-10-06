'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Link2, MoreHorizontal, Pencil, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PanelIconButton, PanelIconGroup, PanelMenu } from '@/app/(app)/_components/panel-ui';
import { bookingLink } from '@/app/(app)/_components/mock-services';
import { BusinessCard } from './business-ui';
import { EditBusinessDialog, type EditableBusiness } from './EditBusinessDialog';

function NextStep({
    icon,
    title,
    description,
    href,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    href: string;
    action: string;
}) {
    return (
        <article className="flex flex-col items-start gap-2 rounded-md border border-[#e5e7eb] bg-white p-4 sm:p-6 [&_svg]:size-5">
            {icon}
            <h3 className="m-0 mt-2 text-[16px] font-bold tracking-[-0.02em]">{title}</h3>
            <p className="m-0 text-[13px] font-medium leading-relaxed text-[#6b7280]">{description}</p>
            <Link
                href={href}
                className="mt-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3.5 text-[13px] font-bold text-[#0f1b2d] transition-colors outline-none hover:bg-[#f3f4f6] focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-1 [&_svg]:size-4"
            >
                {action}
                <ArrowRight />
            </Link>
        </article>
    );
}

/** Mi Negocio del Dueño: su Negocio y los próximos pasos recomendados. */
export function BusinessOverview({ business }: { business: EditableBusiness }) {
    const [editing, setEditing] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`https://${bookingLink(business.slug)}`);
            toast.success('Enlace de reserva copiado');
        } catch {
            toast.error('No se pudo copiar el Enlace de reserva');
        }
    };

    return (
        <>
            <BusinessCard
                business={business}
                role="owner"
                actions={
                    <PanelIconGroup>
                        <PanelIconButton label="Copiar Enlace de reserva" onClick={copyLink}>
                            <Link2 />
                        </PanelIconButton>
                        <PanelMenu
                            trigger={
                                <PanelIconButton label="Más acciones">
                                    <MoreHorizontal />
                                </PanelIconButton>
                            }
                            items={[{ label: 'Editar negocio', icon: <Pencil />, onSelect: () => setEditing(true) }]}
                        />
                    </PanelIconGroup>
                }
            >
                <h2 className="m-0 text-[14.5px] font-bold tracking-[-0.02em]">Próximos pasos recomendados</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <NextStep
                        icon={<UserPlus className="text-[#15803d]" />}
                        title="Invitar empleado"
                        description="Los turnos salen mejor con todo tu equipo. Invitalos ahora."
                        href="/business/employees"
                        action="Invitar"
                    />
                    <NextStep
                        icon={<Pencil className="text-[#7c3aed]" />}
                        title="Apariencia"
                        description="Elegí cómo ven tus Clientes tu Enlace de reserva."
                        href="/business/appearance"
                        action="Editar"
                    />
                </div>
            </BusinessCard>

            {editing && <EditBusinessDialog business={business} onClose={() => setEditing(false)} />}
        </>
    );
}
