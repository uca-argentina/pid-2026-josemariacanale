'use client';

import { AtSign, Fingerprint } from 'lucide-react';
import { PanelAvatar, PanelButton, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';
import { RoleBadge } from '../../_components/business-ui';
import type { EmployeeRow } from './EmployeesView';

/** Perfil de solo lectura de un Empleado. Se monta al abrirse. */
export function EmployeeDialog({ employee, onClose }: { employee: EmployeeRow; onClose: () => void }) {
    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title={employee.name}
            description={`Perfil de ${employee.name}`}
            footer={
                <PanelDialogClose>
                    <PanelButton variant="secondary">Cerrar</PanelButton>
                </PanelDialogClose>
            }
        >
            <div className="overflow-hidden rounded-xl border border-[#e5e7eb]">
                <div className="h-24 bg-linear-to-b from-[#e5e7eb] to-[#f9fafb]" />
                <div className="-mt-9 flex px-5 pb-5">
                    <PanelAvatar name={employee.name} imageUrl={employee.imageUrl} className="size-18 text-[20px] ring-4 ring-white" />
                </div>
            </div>

            <dl className="m-0 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-y-4 text-[13.5px]">
                <dt className="flex items-center gap-2 font-medium text-[#6b7280]">
                    <AtSign className="size-4" />
                    Email
                </dt>
                <dd className="m-0 font-semibold break-all">{employee.email}</dd>
                <dt className="flex items-center gap-2 font-medium text-[#6b7280]">
                    <Fingerprint className="size-4" />
                    Rol
                </dt>
                <dd className="m-0">
                    <RoleBadge role={employee.role} />
                </dd>
            </dl>
        </PanelDialog>
    );
}
