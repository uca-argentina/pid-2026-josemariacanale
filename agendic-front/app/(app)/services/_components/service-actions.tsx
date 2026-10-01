'use client';

import { useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm, PanelIconButton } from '@/app/(app)/_components/panel-ui';
import { canStopOffering, type OfferableService } from './offering';
/**
 * Abrir el Enlace de reserva y copiarlo. Van dentro de un `PanelIconGroup`.
 *
 * @param path la ruta del Enlace de reserva en este mismo front, como la arma `bookingLinkPath`
 */
export function PublicLinkButtons({ path }: { path: string }) {
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}${path}`);
            toast.success('Enlace de reserva copiado');
        } catch {
            toast.error('No se pudo copiar el Enlace de reserva');
        }
    };

    return (
        <>
            <PanelIconButton label="Abrir Enlace de reserva" onClick={() => window.open(path, '_blank')}>
                <ExternalLink />
            </PanelIconButton>
            <PanelIconButton label="Copiar Enlace de reserva" onClick={copy}>
                <Link2 />
            </PanelIconButton>
        </>
    );
}

const NAMES = new Intl.ListFormat('es', { type: 'conjunction' });


/**
 * Ofrecer o dejar de ofrecer un Servicio, como Dueño o como Empleado. Pide confirmación, pero todavía no cambia nada.
 * Si sos el único que lo ofrece, en vez de confirmar avisa por qué no se puede.
 */
export function OfferButton({ service }: { service: OfferableService }) {
    const [open, setOpen] = useState(false);
    const offered = service.offeredByMe;
    const blocked = offered && !canStopOffering(service);

    const dialog = blocked
        ? {
              title: `No podés dejar de ofrecer "${service.name}"`,
              description:
                  'Sos el único empleado que lo atiende. Para dejarlo, otro empleado tiene que ofrecerlo primero.',
          }
        : {
              title: '¿Estás seguro?',
              description: offered
                  ? `Vas a dejar de atender "${service.name}". Lo siguen atendiendo ${NAMES.format(service.otherEmployees)}.`
                  : `Vas a empezar a atender "${service.name}" en los horarios que elijas en Disponibilidad.`,
              confirmLabel: offered ? 'Dejar de ofrecer' : 'Ofrecer',
          };

    return (
        <>
            <PanelButton variant="secondary" onClick={() => setOpen(true)}>
                {offered ? 'Dejar de ofrecer' : 'Ofrecer'}
            </PanelButton>
            <PanelConfirm
                open={open}
                onOpenChange={setOpen}
                {...dialog}
                cancelLabel={blocked ? 'Entendido' : 'Cancelar'}
                destructive={offered}
                // ponytail: todavía no hace nada; se conecta cuando exista el endpoint.
                onConfirm={() => {}}
            />
        </>
    );
}
