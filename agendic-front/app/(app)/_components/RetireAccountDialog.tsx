'use client';

import { useState, useTransition } from 'react';
import { useClerk } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { retireMeAction } from '@/app/(app)/actions';
import { PanelButton, PanelDialog, PanelDialogClose } from './panel-ui';

/**
 * Confirma darse de baja (ADR 0023). Con `ok` el back ya borró al Usuario y con `deactivated` ya lo había hecho
 * antes: en ambos casos se cierra la Sesión de Clerk y se vuelve al inicio. Ante un error el diálogo queda
 * abierto para reintentar, que es seguro.
 */
export function RetireAccountDialog({ businessName, onClose }: { businessName: string | null; onClose: () => void }) {
    const { signOut } = useClerk();
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const retire = () => {
        setError(undefined);
        startTransition(async () => {
            const result = await retireMeAction();
            if (result.ok || result.deactivated) {
                await signOut({ redirectUrl: '/' });
                return;
            }
            setError(result.message);
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !isPending && onClose()}
            title="¿Darte de baja?"
            description="No se puede deshacer."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost" disabled={isPending}>
                            Cancelar
                        </PanelButton>
                    </PanelDialogClose>
                    <PanelButton onClick={retire} disabled={isPending} className="min-w-[124px] bg-[#b91c1c] hover:bg-[#991b1b]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Darme de baja'}
                    </PanelButton>
                </>
            }
        >
            <div className="flex flex-col gap-4 text-[13px] font-medium leading-relaxed text-[#374151]">
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                    <li>Se cancelan todos tus Turnos futuros.</li>
                    <li>Dejás de ser Empleado en cada Negocio.</li>
                    <li>Se dan de baja tus Servicios personales.</li>
                    <li>Si volvés a registrarte con el mismo email, empezás de cero.</li>
                </ul>
                {businessName && (
                    <p className="m-0 font-semibold text-[#b91c1c]">
                        Sos Dueño de {businessName}: también queda dado de baja, con sus Servicios, su Staff y sus Turnos futuros.
                    </p>
                )}
                {error && (
                    <p role="alert" className="m-0 font-semibold text-[#b91c1c]">
                        {error}
                    </p>
                )}
            </div>
        </PanelDialog>
    );
}
