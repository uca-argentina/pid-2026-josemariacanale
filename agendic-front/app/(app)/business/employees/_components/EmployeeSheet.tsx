'use client';

import { Dialog } from 'radix-ui';
import { AtSign, Fingerprint } from 'lucide-react';
import { PanelAvatar, PanelButton } from '@/app/(app)/_components/panel-ui';
import { RoleBadge } from '../../_components/business-ui';
import type { EmployeeRow } from './EmployeesView';

/** Panel lateral de solo lectura con el perfil de un Empleado. Se monta al abrirse. */
export function EmployeeSheet({ employee, onClose }: { employee: EmployeeRow; onClose: () => void }) {
    return (
        <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-[#0f1b2d]/50" />
                <Dialog.Content className="fixed inset-y-2 right-2 z-50 flex w-[calc(100vw-16px)] max-w-[440px] flex-col overflow-hidden rounded-xl bg-white text-[#0f1b2d] shadow-[0_24px_60px_rgba(15,27,45,0.25)] outline-none">
                    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                        <div className="overflow-hidden rounded-xl border border-[#e5e7eb]">
                            <div className="h-24 bg-linear-to-b from-[#e5e7eb] to-[#f9fafb]" />
                            <div className="-mt-9 flex flex-col gap-3 px-5 pb-5">
                                <PanelAvatar name={employee.name} className="size-18 text-[20px] ring-4 ring-white" />
                                <Dialog.Title className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">
                                    {employee.name}
                                </Dialog.Title>
                                <Dialog.Description className="sr-only">Perfil de {employee.name}</Dialog.Description>
                            </div>
                        </div>

                        <section className="flex flex-col gap-4">
                            <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.02em]">Perfil</h3>
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
                        </section>
                    </div>
                    <div className="flex justify-end border-t border-[#e5e7eb] bg-[#f9fafb] px-6 py-4">
                        <Dialog.Close asChild>
                            <PanelButton variant="secondary">Cerrar</PanelButton>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
