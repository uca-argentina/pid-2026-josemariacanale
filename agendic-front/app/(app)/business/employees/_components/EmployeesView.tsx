'use client';

import { useState, useTransition } from 'react';
import { Loader2, MoreHorizontal, PanelRightOpen, Plus, Search, UserRound, UserX } from 'lucide-react';
import { toast } from 'sonner';
import {
    PanelAvatar,
    PanelButton,
    PanelConfirm,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelIconButton,
    PanelIconGroup,
    PanelInput,
    PanelMenu,
} from '@/app/(app)/_components/panel-ui';
import { cn } from '@/app/_components/utils';
import { employeeSchema, fieldErrorsOf, type EmployeeFields, type FieldErrors } from '@/app/_components/business-schemas';
import { RoleBadge, type BusinessRole } from '../../_components/business-ui';
import { addEmployeeAction, retireEmployeeAction } from '../actions';
import { EmployeeSheet } from './EmployeeSheet';

export type EmployeeRow = { id: number; name: string; email: string; role: BusinessRole };

function InviteEmployeeDialog({ businessId, onClose }: { businessId: number; onClose: () => void }) {
    const [form, setForm] = useState<EmployeeFields>({ email: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(undefined);
        const result = employeeSchema.safeParse(form);
        if (!result.success) {
            setErrors(fieldErrorsOf(result.error));
            return;
        }
        setErrors({});
        startTransition(async () => {
            const response = await addEmployeeAction({ businessId, ...result.data });
            if (!response.ok) {
                setSubmitError(response.message);
                return;
            }
            toast.success(`${result.data.email}: invitado a tu Negocio`);
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
                        autoFocus
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'invite-email-error' : undefined}
                    />
                </PanelField>
                {submitError && (
                    <p role="alert" className="m-0 text-[13px] font-semibold text-[#b91c1c]">
                        {submitError}
                    </p>
                )}
            </form>
        </PanelDialog>
    );
}

/** El Staff del Negocio. La lista viene del server: invitar y dar de baja la refrescan. */
export function EmployeesView({ businessId, employees }: { businessId: number; employees: EmployeeRow[] }) {
    const [query, setQuery] = useState('');
    const [inviting, setInviting] = useState(false);
    const [viewing, setViewing] = useState<EmployeeRow>();
    const [retiring, setRetiring] = useState<EmployeeRow>();
    const [, startTransition] = useTransition();

    const q = query.trim().toLowerCase();
    const visible = employees.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));

    const retire = (employee: EmployeeRow) =>
        startTransition(async () => {
            const response = await retireEmployeeAction({ employeeId: employee.id });
            if (response.ok) toast.success(`${employee.name}: dado de baja`);
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
                <PanelButton onClick={() => setInviting(true)}>
                    <Plus className="size-4" />
                    Invitar
                </PanelButton>
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
                                        <PanelAvatar name={employee.name} />
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-[14px] font-bold tracking-[-0.02em]">{employee.name}</span>
                                            <span className="truncate text-[12.5px] font-medium text-[#6b7280]">{employee.email}</span>
                                        </div>
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
                                            {/* El Dueño no se da de baja de su propio Negocio. */}
                                            {employee.role === 'employee' && (
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
                    </tbody>
                </table>
            </div>

            <p className={cn('m-0 text-center text-[13px] font-medium text-[#9ca3af]', visible.length === 0 && 'mt-10')}>
                {visible.length === 0 ? 'No hay empleados que coincidan con la búsqueda' : 'No hay más resultados'}
            </p>

            {inviting && <InviteEmployeeDialog businessId={businessId} onClose={() => setInviting(false)} />}
            {viewing && <EmployeeSheet employee={viewing} onClose={() => setViewing(undefined)} />}
            <PanelConfirm
                open={Boolean(retiring)}
                onOpenChange={(open) => !open && setRetiring(undefined)}
                title={`¿Dar de baja a ${retiring?.name ?? ''}?`}
                description="Deja de atender en tu Negocio y sus Turnos futuros quedan cancelados."
                confirmLabel="Dar de baja"
                destructive
                onConfirm={() => retiring && retire(retiring)}
            />
        </div>
    );
}
