'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { ExternalLink, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm, PanelIconButton, PanelSwitch } from '@/app/(app)/_components/panel-ui';
import { assignEmployeeAction, removeEmployeeAction, retireServiceAction, updateServiceAction } from '../actions';
import { retiredMessage, stoppedOfferingMessage } from './format';
import { canStopOffering, offersIt, othersAttending, type OfferableService } from './offering';

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

/** El Empleado sobre el que se actúa: el propio Usuario, o otro del Staff cuando lo hace el Dueño. */
export interface OfferingEmployee {
    id: number;
    name: string;
    isMe: boolean;
}

/** Ofrece el Servicio en nombre del Empleado, con su Availability predeterminada, y avisa cómo salió. */
export async function offerService(service: OfferableService, employee: OfferingEmployee) {
    const result = await assignEmployeeAction({ serviceId: service.id, employeeId: employee.id });
    if (!result.ok) toast.error(result.message);
    else if (employee.isMe) toast.success(`Ahora ofrecés ${result.name}`);
    else toast.success(`${employee.name} ahora ofrece ${result.name}`);
}

/**
 * La confirmación de dejar de ofrecer un Servicio: dice quiénes lo siguen atendiendo y que los Turnos futuros del
 * Empleado en él se cancelan; al terminar informa cuántos. Si es el único que lo atiende, en vez de confirmar explica
 * por qué no puede.
 *
 * @param onStopped vuelve a la lista o la refresca, para que se vea el cambio
 */
export function StopOfferingConfirm({
    service,
    employee,
    open,
    onOpenChange,
    onStopped,
}: {
    service: OfferableService;
    employee: OfferingEmployee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStopped: () => void;
}) {
    const others = othersAttending(service, employee.id);

    const stop = async () => {
        const toastId = toast.loading(`Dejando de ofrecer ${service.name}…`);
        const result = await removeEmployeeAction({ serviceId: service.id, employeeId: employee.id });
        if (!result.ok) {
            toast.error(result.message, { id: toastId });
            return;
        }
        toast.success(stoppedOfferingMessage(service.name, employee.isMe ? null : employee.name, result.cancelledBookings), {
            id: toastId,
        });
        onStopped();
    };

    if (!canStopOffering(service, employee.id))
        return (
            <PanelConfirm
                open={open}
                onOpenChange={onOpenChange}
                title={
                    employee.isMe
                        ? `No podés dejar de ofrecer "${service.name}"`
                        : `${employee.name} no puede dejar de ofrecer "${service.name}"`
                }
                description={
                    employee.isMe
                        ? 'Sos el único Empleado que lo atiende. Para dejarlo, otro Empleado tiene que ofrecerlo primero.'
                        : 'Es el único Empleado que lo atiende. Para quitarlo, otro Empleado tiene que ofrecerlo primero.'
                }
                cancelLabel="Entendido"
            />
        );

    return (
        <PanelConfirm
            open={open}
            onOpenChange={onOpenChange}
            title="¿Estás seguro?"
            description={
                employee.isMe
                    ? `Vas a dejar de atender "${service.name}". Lo siguen atendiendo ${NAMES.format(others)}. Tus Turnos futuros de este Servicio se cancelan.`
                    : `${employee.name} va a dejar de atender "${service.name}". Lo siguen atendiendo ${NAMES.format(others)}. Sus Turnos futuros de este Servicio se cancelan.`
            }
            confirmLabel="Dejar de ofrecer"
            destructive
            onConfirm={() => void stop()}
        />
    );
}

/**
 * Ofrecer o dejar de ofrecer un Servicio, como Dueño o como Empleado, siempre sobre el propio Usuario. Ofrecer entra
 * con sus Horas laborables predeterminadas.
 *
 * @param employeeId el Empleado del Usuario en el Negocio del Servicio
 * @param onStopped vuelve a la lista o la refresca después de dejar de ofrecerlo
 */
export function OfferButton({
    service,
    employeeId,
    onStopped,
}: {
    service: OfferableService;
    employeeId: number;
    onStopped: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [offering, startOffering] = useTransition();
    const offered = offersIt(service, employeeId);
    const me = { id: employeeId, name: '', isMe: true };

    return (
        <>
            <PanelButton variant="secondary" disabled={offering} onClick={() => setOpen(true)} className="min-w-[96px]">
                {offering ? <Loader2 className="size-4 animate-spin" /> : offered ? 'Dejar de ofrecer' : 'Ofrecer'}
            </PanelButton>
            {offered ? (
                <StopOfferingConfirm service={service} employee={me} open={open} onOpenChange={setOpen} onStopped={onStopped} />
            ) : (
                <PanelConfirm
                    open={open}
                    onOpenChange={setOpen}
                    title="¿Estás seguro?"
                    description={`Vas a empezar a atender "${service.name}" con tus Horas laborables predeterminadas.`}
                    confirmLabel="Ofrecer"
                    onConfirm={() => startOffering(() => offerService(service, me))}
                />
            )}
        </>
    );
}

/**
 * El switch del Dueño que oculta o muestra un Servicio en la página de su Sucursal, o el Usuario en la suya si es
 * personal. Guarda al tocarlo y muestra el cambio enseguida; si el back falla, vuelve atrás.
 *
 * @param page la página de la que se oculta, como se nombra en los textos
 * @param showLabel muestra al lado si está visible u oculto, además del tooltip
 */
export function HiddenSwitch({
    service,
    page = 'la página de la Sucursal',
    showLabel,
}: {
    service: { id: number; hidden: boolean };
    page?: string;
    showLabel?: boolean;
}) {
    const [hidden, setHidden] = useOptimistic(service.hidden);
    const [saving, startSaving] = useTransition();

    const toggle = (visible: boolean) =>
        startSaving(async () => {
            setHidden(!visible);
            const result = await updateServiceAction({ id: service.id, hidden: !visible });
            if (!result.ok) toast.error(result.message);
            else if (result.hidden) toast.success(`${result.name}: oculto de ${page}`);
            else toast.success(`${result.name}: visible en ${page}`);
        });

    return (
        <label
            className="flex items-center gap-2 text-[12.5px] font-semibold text-[#6b7280]"
            title={`Un Servicio oculto no aparece en ${page}, pero se puede Reservar entrando por su propio Enlace de reserva.`}
        >
            <PanelSwitch
                checked={!hidden}
                disabled={saving}
                onCheckedChange={toggle}
                aria-label={hidden ? `Mostrar en ${page}` : `Ocultar de ${page}`}
            />
            {showLabel && (hidden ? `Oculto de ${page}` : `Visible en ${page}`)}
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
