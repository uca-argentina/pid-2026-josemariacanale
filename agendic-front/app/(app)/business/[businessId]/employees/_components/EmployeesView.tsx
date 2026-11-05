'use client';

import { useState, useTransition } from 'react';
import { Loader2, MailX, MoreHorizontal, PanelRightOpen, Plus, RotateCw, Search, UserRound, UserX } from 'lucide-react';
import { toast } from 'sonner';
import {
    PanelAvatar,
    PanelBadge,
    PanelButton,
    PanelCheckbox,
    PanelConfirm,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelIconButton,
    PanelIconGroup,
    PanelInput,
    PanelMenu,
} from '@/app/(app)/_components/panel-ui';
import { inviteEmployeeSchema, fieldErrorsOf, type FieldErrors } from '@/app/_components/business-schemas';
import type { EmployeeBadge } from '@/src/entities/models/employee';
import { RoleBadge, type BusinessRole } from '../../../_components/business-ui';
import { addEmployeeAction, cancelInvitationAction, resendInvitationAction, retireEmployeeAction } from '../actions';
import { EmployeeMedals } from './EmployeeMedals';
import { EmployeeSheet } from './EmployeeSheet';

/** Una fila del Staff; `badges` viene de mayor a menor Nivel y `branchNames` son las Sucursales donde trabaja. */
export type EmployeeRow = {
    id: number;
    name: string;
    email: string;
    imageUrl: string | null;
    badges: EmployeeBadge[];
    branchNames: string[];
    role: BusinessRole;
};
/** Invitación pendiente del Negocio; `expiresAt` es ISO y se muestra en hora de Buenos Aires. */
export type InvitationRow = { id: number; email: string; expiresAt: string; branchNames: string[] };
/** Una Sucursal del Negocio, para elegir dónde va a trabajar la persona invitada. */
export type BranchOption = { id: number; name: string };

const EXPIRY_DATE_FORMAT = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' });

function BranchNames({ names }: { names: string[] }) {
    if (names.length === 0) return null;
    return <span className="truncate text-[12.5px] font-medium text-[#374151]">{names.join(' · ')}</span>;
}

/** Con una sola Sucursal no se pregunta: el back la usa sin `branchIds`. */
function InviteEmployeeDialog({ businessId, branches, onClose }: { businessId: number; branches: BranchOption[]; onClose: () => void }) {
    const [form, setForm] = useState({ email: '' });
    const [branchIds, setBranchIds] = useState<number[]>([]);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, startTransition] = useTransition();
    const choosesBranches = branches.length > 1;

    const toggleBranch = (id: number, checked: boolean) =>
        setBranchIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(undefined);
        const result = inviteEmployeeSchema.safeParse(form);
        const nextErrors: FieldErrors = result.success ? {} : fieldErrorsOf(result.error);
        if (choosesBranches && branchIds.length === 0) nextErrors.branchIds = 'Elegí al menos una Sucursal.';
        setErrors(nextErrors);
        if (!result.success || Object.keys(nextErrors).length > 0) return;
        startTransition(async () => {
            const response = await addEmployeeAction({ businessId, ...result.data, ...(choosesBranches && { branchIds }) });
            if (!response.ok) {
                if (response.field) setErrors({ [response.field]: response.message });
                else setSubmitError(response.message);
                return;
            }
            toast.success('Invitación enviada');
            onClose();
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !isPending && onClose()}
            title="Invitar empleado"
            description="Va a poder atender turnos de tu Negocio."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cancelar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form="invite-employee" disabled={isPending} className="min-w-[124px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Enviar invitación'}
                    </PanelButton>
                </>
            }
        >
            <form id="invite-employee" onSubmit={submit} noValidate className="flex flex-col gap-5">
                <PanelField label="Email" htmlFor="invite-email" error={errors.email}>
                    <PanelInput
                        id="invite-email"
                        type="email"
                        autoFocus
                        placeholder="email@ejemplo.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'invite-email-error' : undefined}
                    />
                </PanelField>
                {choosesBranches && (
                    <fieldset
                        className="m-0 flex flex-col gap-2 border-0 p-0"
                        aria-invalid={Boolean(errors.branchIds)}
                        aria-describedby={errors.branchIds ? 'invite-branches-error' : undefined}
                    >
                        <legend className="mb-2 p-0 text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">Sucursales</legend>
                        {branches.map((branch) => (
                            <label
                                key={branch.id}
                                htmlFor={`invite-branch-${branch.id}`}
                                className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-medium text-[#0f1b2d]"
                            >
                                <PanelCheckbox
                                    id={`invite-branch-${branch.id}`}
                                    checked={branchIds.includes(branch.id)}
                                    onCheckedChange={(checked) => toggleBranch(branch.id, checked === true)}
                                />
                                {branch.name}
                            </label>
                        ))}
                        {errors.branchIds && (
                            <p id="invite-branches-error" role="alert" className="m-0 text-[13px] font-semibold text-[#b91c1c]">
                                {errors.branchIds}
                            </p>
                        )}
                    </fieldset>
                )}
                {submitError && (
                    <p role="alert" className="m-0 text-[13px] font-semibold text-[#b91c1c]">
                        {submitError}
                    </p>
                )}
            </form>
        </PanelDialog>
    );
}

/**
 * El Staff del Negocio. La lista viene del server: invitar y dar de baja la refrescan. Para quien no es el Dueño es de
 * solo lectura: sin Invitar, sin Dar de baja y sin Invitaciones pendientes.
 */
export function EmployeesView({
    businessId,
    viewerIsOwner,
    employees,
    invitations,
    branches,
}: {
    businessId: number;
    /** Si quien mira es el Dueño del Negocio: solo él invita, da de baja y ve las estadísticas de un Empleado. */
    viewerIsOwner: boolean;
    employees: EmployeeRow[];
    invitations: InvitationRow[];
    branches: BranchOption[];
}) {
    const [query, setQuery] = useState('');
    const [inviting, setInviting] = useState(false);
    const [viewing, setViewing] = useState<EmployeeRow>();
    const [retiring, setRetiring] = useState<EmployeeRow>();
    const [cancelling, setCancelling] = useState<InvitationRow>();
    const [, startTransition] = useTransition();

    const q = query.trim().toLowerCase();
    const visible = employees.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));

    const visibleInvitations = invitations.filter((i) => i.email.toLowerCase().includes(q));
    const noResults = visible.length + visibleInvitations.length === 0;

    const retire = (employee: EmployeeRow) =>
        startTransition(async () => {
            const response = await retireEmployeeAction({ employeeId: employee.id });
            if (response.ok) toast.success(`${employee.name}: dado de baja`);
            else toast.error(response.message);
        });

    const resend = (invitation: InvitationRow) =>
        startTransition(async () => {
            const response = await resendInvitationAction({ invitationId: invitation.id });
            if (response.ok) toast.success(`Invitación reenviada a ${invitation.email}`);
            else toast.error(response.message);
        });

    const cancel = (invitation: InvitationRow) =>
        startTransition(async () => {
            const response = await cancelInvitationAction({ invitationId: invitation.id });
            if (response.ok) toast.success(`Invitación a ${invitation.email} cancelada`);
            else toast.error(response.message);
        });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-full max-w-[320px] items-center gap-2 rounded-md border border-[#d1d5db] px-3 focus-within:border-[#0f1b2d] focus-within:ring-1 focus-within:ring-[#0f1b2d]">
                    <Search className="size-4 shrink-0 text-[#6b7280]" />
                    <input
                        aria-label="Buscar empleados"
                        placeholder="Buscar"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] font-medium outline-none placeholder:text-[#9ca3af]"
                    />
                </div>
                {viewerIsOwner && (
                    <PanelButton onClick={() => setInviting(true)}>
                        <Plus className="size-4" />
                        Invitar
                    </PanelButton>
                )}
            </div>

            <div className="overflow-x-auto rounded-md border border-[#e5e7eb]">
                <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead className="bg-[#f9fafb] text-[12.5px] font-bold text-[#6b7280]">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-bold">
                                Empleado
                            </th>
                            <th scope="col" className="w-40 px-6 py-3 font-bold">
                                Rol
                            </th>
                            <th scope="col" className="w-32 px-6 py-3">
                                <span className="sr-only">Acciones</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb] border-t border-[#e5e7eb]">
                        {visible.map((employee) => (
                            <tr key={employee.id} className="transition-colors hover:bg-[#f9fafb]">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <PanelAvatar name={employee.name} imageUrl={employee.imageUrl} />
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-[14px] font-bold tracking-[-0.02em]">{employee.name}</span>
                                            <span className="truncate text-[12.5px] font-medium text-[#6b7280]">{employee.email}</span>
                                            <BranchNames names={employee.branchNames} />
                                        </div>
                                        <EmployeeMedals badges={employee.badges} />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <RoleBadge role={employee.role} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end">
                                        <PanelIconGroup>
                                            <PanelIconButton label={`Ver a ${employee.name}`} onClick={() => setViewing(employee)}>
                                                <PanelRightOpen />
                                            </PanelIconButton>
                                            {/* El Dueño no se da de baja de su propio Negocio, y un Empleado no da de baja a nadie. */}
                                            {viewerIsOwner && employee.role === 'employee' && (
                                                <PanelMenu
                                                    trigger={
                                                        <PanelIconButton label="Más acciones">
                                                            <MoreHorizontal />
                                                        </PanelIconButton>
                                                    }
                                                    items={[
                                                        { label: 'Ver perfil', icon: <UserRound />, onSelect: () => setViewing(employee) },
                                                        {
                                                            label: 'Dar de baja',
                                                            icon: <UserX />,
                                                            destructive: true,
                                                            onSelect: () => setRetiring(employee),
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </PanelIconGroup>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {visibleInvitations.map((invitation) => (
                            <tr key={`invitation-${invitation.id}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <PanelAvatar name={invitation.email} />
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-[14px] font-bold tracking-[-0.02em]">{invitation.email}</span>
                                            <span className="truncate text-[12.5px] font-medium text-[#6b7280]">
                                                Vence el {EXPIRY_DATE_FORMAT.format(new Date(invitation.expiresAt))}
                                            </span>
                                            <BranchNames names={invitation.branchNames} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <PanelBadge>Invitación pendiente</PanelBadge>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end">
                                        <PanelIconGroup>
                                            <PanelIconButton label={`Reenviar invitación a ${invitation.email}`} onClick={() => resend(invitation)}>
                                                <RotateCw />
                                            </PanelIconButton>
                                            <PanelIconButton label={`Cancelar invitación a ${invitation.email}`} onClick={() => setCancelling(invitation)}>
                                                <MailX />
                                            </PanelIconButton>
                                        </PanelIconGroup>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {noResults && (
                <p className="m-0 mt-10 text-center text-[13px] font-medium text-[#9ca3af]">No hay empleados que coincidan con la búsqueda</p>
            )}

            {inviting && <InviteEmployeeDialog businessId={businessId} branches={branches} onClose={() => setInviting(false)} />}
            {viewing && (
                <EmployeeSheet businessId={businessId} employee={viewing} showStats={viewerIsOwner} onClose={() => setViewing(undefined)} />
            )}
            <PanelConfirm
                open={Boolean(retiring)}
                onOpenChange={(open) => !open && setRetiring(undefined)}
                title={`¿Dar de baja a ${retiring?.name ?? ''}?`}
                description="Deja de atender en tu Negocio y sus Turnos futuros quedan cancelados."
                confirmLabel="Dar de baja"
                destructive
                onConfirm={() => retiring && retire(retiring)}
            />
            <PanelConfirm
                open={Boolean(cancelling)}
                onOpenChange={(open) => !open && setCancelling(undefined)}
                title={`¿Cancelar la invitación a ${cancelling?.email ?? ''}?`}
                description="La persona ya no va a poder aceptarla."
                confirmLabel="Cancelar invitación"
                destructive
                onConfirm={() => cancelling && cancel(cancelling)}
            />
        </div>
    );
}
