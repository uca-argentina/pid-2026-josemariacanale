'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { PanelAvatar, PanelButton, PanelSection } from '@/app/(app)/_components/panel-ui';
import { bookingLink } from '@/app/(app)/_components/mock-services';
import { BusinessCard } from './business-ui';
import { CreateBusinessDialog, type Owner } from './CreateBusinessDialog';
import { pendingInvitations, type Invitation } from './mock-invitations';

/** Mi Negocio de un Usuario que todavía no hizo Crear Negocio: sus invitaciones y el botón para crearlo. */
export function NoBusinessView({ owner }: { owner: Owner }) {
    const [invitations, setInvitations] = useState(pendingInvitations);
    // ponytail: aceptar es solo estado local; se pierde al recargar hasta que el back maneje invitaciones.
    const [joined, setJoined] = useState<Invitation['business']>();
    const [creating, setCreating] = useState(false);

    const answer = (invitation: Invitation, accepted: boolean) => {
        setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
        if (accepted) setJoined(invitation.business);
        toast.success(
            accepted ? `Te sumaste a ${invitation.business.name}` : `Rechazaste la invitación de ${invitation.business.name}`,
        );
    };

    if (joined) return <BusinessCard business={joined} role="employee" />;

    return (
        <div className="flex flex-col gap-8">
            {invitations.length > 0 && (
                <PanelSection title="Invitaciones pendientes">
                    <ul className="m-0 list-none divide-y divide-[#e5e7eb] p-0">
                        {invitations.map((invitation) => (
                            <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                                <PanelAvatar name={invitation.business.name} />
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-[14.5px] font-bold tracking-[-0.02em]">
                                        {invitation.business.name}
                                    </span>
                                    <span className="truncate text-[12.5px] font-medium text-[#6b7280]">
                                        {bookingLink(invitation.business.slug)}
                                    </span>
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <PanelButton variant="secondary" onClick={() => answer(invitation, false)}>
                                        Rechazar
                                    </PanelButton>
                                    <PanelButton variant="secondary" onClick={() => answer(invitation, true)}>
                                        <Check className="size-4" />
                                        Aceptar
                                    </PanelButton>
                                </div>
                            </li>
                        ))}
                    </ul>
                </PanelSection>
            )}

            <section className="flex flex-col items-start gap-4 rounded-xl bg-[#0f1b2d] px-8 py-10 text-white">
                <h2 className="m-0 max-w-[520px] text-[26px] font-extrabold leading-tight tracking-[-0.035em]">
                    Agendic es mejor con tu equipo
                </h2>
                <p className="m-0 max-w-[520px] text-[14px] font-medium leading-relaxed text-white/75">
                    Creá tu Negocio, sumá a tus Empleados y dejá que tus Clientes reserven turnos solos desde tu Enlace de
                    reserva.
                </p>
                <PanelButton variant="secondary" className="mt-2 border-transparent" onClick={() => setCreating(true)}>
                    Crear negocio
                </PanelButton>
            </section>

            {creating && <CreateBusinessDialog owner={owner} onClose={() => setCreating(false)} />}
        </div>
    );
}
