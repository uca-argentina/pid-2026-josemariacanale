'use client';

import { useState } from 'react';
import { PanelButton, PanelCheckbox, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';

/** Un Servicio que atiende el Empleado, con la Availability que usa. */
export interface OfferedService {
    id: string;
    name: string;
    availabilityId: string;
}

/**
 * Después de marcar una Availability como predeterminada, ofrece pasarle los Servicios.
 * Es opcional: cerrarlo deja la predeterminada marcada y los Servicios como estaban.
 */
export function UpdateServicesDialog({
    services,
    onClose,
    onUpdate,
}: {
    services: OfferedService[];
    onClose: () => void;
    onUpdate: (serviceIds: string[]) => void;
}) {
    const [picked, setPicked] = useState(() => services.map((s) => s.id));

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title="¿Actualizar tus servicios?"
            description="Usá estas horas laborables en los servicios que elijas."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cerrar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton disabled={picked.length === 0} onClick={() => onUpdate(picked)}>
                        Actualizar
                    </PanelButton>
                </>
            }
        >
            <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-[13.5px] font-semibold text-[#0f1b2d]">
                    <PanelCheckbox
                        checked={picked.length === services.length}
                        onCheckedChange={(on) => setPicked(on === true ? services.map((s) => s.id) : [])}
                    />
                    Seleccionar todos
                </label>
                {services.map((s) => (
                    <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md bg-[#f9fafb] px-4 py-3.5 text-[13.5px] font-semibold text-[#0f1b2d]"
                    >
                        <PanelCheckbox
                            checked={picked.includes(s.id)}
                            onCheckedChange={(on) =>
                                setPicked((p) => (on === true ? [...p, s.id] : p.filter((id) => id !== s.id)))
                            }
                        />
                        {s.name}
                    </label>
                ))}
            </div>
        </PanelDialog>
    );
}
