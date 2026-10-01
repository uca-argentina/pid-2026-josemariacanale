'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm, PanelIconButton, PanelSwitch } from '@/app/(app)/_components/panel-ui';
import { retireServiceAction, updateServiceAction } from '../actions';
import { canStopOffering, type OfferableService } from './offering';
import { retiredMessage } from './format';

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

const HIDDEN_HINT =
    'Un Servicio oculto no aparece en la página de la Sucursal, pero se puede Reservar entrando por su propio Enlace de reserva.';

/**
 * El switch del Dueño que oculta o muestra un Servicio en la página de su Sucursal. Guarda al tocarlo y muestra el
 * cambio enseguida; si el back falla, vuelve atrás.
 *
 * @param showLabel muestra al lado si está visible u oculto, además del tooltip
 */
export function HiddenSwitch({ service, showLabel }: { service: { id: number; hidden: boolean }; showLabel?: boolean }) {
    const [hidden, setHidden] = useOptimistic(service.hidden);
    const [saving, startSaving] = useTransition();

    const toggle = (visible: boolean) =>
        startSaving(async () => {
            setHidden(!visible);
            const result = await updateServiceAction({ id: service.id, hidden: !visible });
            if (!result.ok) toast.error(result.message);
            else if (result.hidden) toast.success(`${result.name}: oculto de la página de la Sucursal`);
            else toast.success(`${result.name}: visible en la página de la Sucursal`);
        });

    return (
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-[#6b7280]" title={HIDDEN_HINT}>
            <PanelSwitch
                checked={!hidden}
                disabled={saving}
                onCheckedChange={toggle}
                aria-label={hidden ? 'Mostrar en la página de la Sucursal' : 'Ocultar de la página de la Sucursal'}
            />
            {showLabel && (hidden ? 'Oculto de la página de la Sucursal' : 'Visible en la página de la Sucursal')}
        </label>
    );
}

/**
 * La confirmación de Dar de baja un Servicio. Al terminar informa cuántos Turnos se cancelaron y llama a `onRetired`,
 * que vuelve a la lista o la refresca.
 */
export function RetireServiceConfirm({
    service,
    open,
    onOpenChange,
    onRetired,
}: {
    service: { id: number; name: string };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRetired: () => void;
}) {
    const retire = async () => {
        const toastId = toast.loading(`Dando de baja ${service.name}…`);
        const result = await retireServiceAction(service.id);
        if (!result.ok) {
            toast.error(result.message, { id: toastId });
            return;
        }
        toast.success(retiredMessage(service.name, result.cancelledBookings), { id: toastId });
        onRetired();
    };

    return (
        <PanelConfirm
            open={open}
            onOpenChange={onOpenChange}
            title={`¿Dar de baja "${service.name}"?`}
            description="Deja de aparecer en tu agenda y sus Turnos futuros quedan cancelados."
            confirmLabel="Dar de baja"
            destructive
            onConfirm={() => void retire()}
        />
    );
}
