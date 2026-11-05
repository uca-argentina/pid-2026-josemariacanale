'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelCheckbox, PanelConfirm, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';
import { savedToast, turnosCount } from '@/app/(app)/_components/left-outside-bookings';
import { useLeftOutsideSave } from '@/app/(app)/_components/use-left-outside-save';
import { changeEmployeeBranchesAction, previewEmployeeBranchesAction, type PreviewEmployeeBranchesResult } from '../actions';
import type { BranchOption, EmployeeRow } from './EmployeesView';

type CancelledBooking = Extract<PreviewEmployeeBranchesResult, { ok: true }>['bookings'][number];

/** Fecha y hora de inicio del Turno en la zona de su Sucursal, ej. `mar 10 nov, 10:00`. */
const formatStart = (booking: CancelledBooking) =>
    new Intl.DateTimeFormat('es-AR', {
        timeZone: booking.timeZone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(booking.startsAt));

/** Los Turnos que se cancelan al sacarle Sucursales al Empleado, para que el Dueño confirme o vuelva. */
function CancelledBookingsDialog({
    bookings,
    pending,
    onBack,
    onConfirm,
}: {
    bookings: CancelledBooking[];
    pending: boolean;
    onBack: () => void;
    onConfirm: () => void;
}) {
    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !pending && onBack()}
            title={`¿Cancelar ${turnosCount(bookings.length)}?`}
            description="Estos Turnos son de Sucursales donde el Empleado deja de trabajar. Cada Cliente va a recibir un mail avisándole."
            footer={
                <>
                    <PanelButton variant="ghost" disabled={pending} onClick={onBack}>
                        Volver
                    </PanelButton>
                    <PanelButton variant="destructive" disabled={pending} onClick={onConfirm}>
                        {pending ? <Loader2 className="size-4 animate-spin" /> : `Cancelar ${turnosCount(bookings.length)} y guardar`}
                    </PanelButton>
                </>
            }
        >
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {bookings.map((booking) => (
                    <li key={booking.id} className="flex flex-col gap-0.5 rounded-md border border-[#e5e7eb] px-4 py-3 text-[13.5px]">
                        <span className="font-bold capitalize">{formatStart(booking)}</span>
                        <span className="font-medium">
                            {booking.serviceName} · {booking.clientName}
                        </span>
                        <span className="font-medium text-[#6b7280]">{booking.branch.name}</span>
                    </li>
                ))}
            </ul>
        </PanelDialog>
    );
}

/**
 * El Dueño elige con checkboxes las Sucursales donde trabaja un Empleado. Al guardar pide la vista previa: sin
 * Turnos que se cancelen guarda directo, y si no los muestra para confirmar. Los rechazos del back salen como aviso.
 */
export function EmployeeBranchesDialog({ employee, branches, onClose }: { employee: EmployeeRow; branches: BranchOption[]; onClose: () => void }) {
    const [branchIds, setBranchIds] = useState(employee.branchIds);
    const [error, setError] = useState<string>();
    const [notice, setNotice] = useState<string>();

    const save = useLeftOutsideSave<number[], CancelledBooking>({
        preview: (ids) => previewEmployeeBranchesAction(employee.id, ids),
        save: (ids, cancelBookingIds) => changeEmployeeBranchesAction(employee.id, ids, cancelBookingIds),
        onSaved: (cancelledBookings) => {
            toast.success(savedToast(`Sucursales de ${employee.name} guardadas`, cancelledBookings));
            onClose();
        },
        onError: setNotice,
    });

    const toggle = (id: number, checked: boolean) => setBranchIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        // Mismo texto que el 400 del back: un Empleado trabaja en al menos una Sucursal.
        if (branchIds.length === 0) return setError('Elegí al menos una Sucursal.');
        setError(undefined);
        save.run(branchIds);
    };

    return (
        <>
            <PanelDialog
                open
                onOpenChange={(open) => !open && !save.isPending && onClose()}
                title={`Sucursales de ${employee.name}`}
                description="Elegí dónde trabaja. Si deja una Sucursal, se cancelan sus Turnos futuros ahí."
                footer={
                    <>
                        <PanelDialogClose>
                            <PanelButton variant="ghost">Cancelar</PanelButton>
                        </PanelDialogClose>
                        <PanelButton type="submit" form="employee-branches" disabled={save.isPending} className="min-w-[96px]">
                            {save.isPending && !save.review ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                        </PanelButton>
                    </>
                }
            >
                <form id="employee-branches" onSubmit={submit} noValidate>
                    <fieldset
                        className="m-0 flex flex-col gap-2 border-0 p-0"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'employee-branches-error' : undefined}
                    >
                        <legend className="mb-2 p-0 text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">Sucursales</legend>
                        {branches.map((branch) => (
                            <label
                                key={branch.id}
                                htmlFor={`employee-branch-${branch.id}`}
                                className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-medium text-[#0f1b2d]"
                            >
                                <PanelCheckbox
                                    id={`employee-branch-${branch.id}`}
                                    checked={branchIds.includes(branch.id)}
                                    onCheckedChange={(checked) => toggle(branch.id, checked === true)}
                                />
                                {branch.name}
                            </label>
                        ))}
                        {error && (
                            <p id="employee-branches-error" role="alert" className="m-0 text-[13px] font-semibold text-[#b91c1c]">
                                {error}
                            </p>
                        )}
                    </fieldset>
                </form>
            </PanelDialog>
            {save.review && <CancelledBookingsDialog bookings={save.review} pending={save.isPending} onBack={save.back} onConfirm={save.confirm} />}
            <PanelConfirm
                open={Boolean(notice)}
                onOpenChange={(open) => !open && setNotice(undefined)}
                title="No se pudieron guardar las Sucursales"
                description={notice ?? ''}
                cancelLabel="Entendido"
            />
        </>
    );
}
