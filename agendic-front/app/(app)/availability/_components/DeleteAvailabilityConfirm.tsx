import { PanelConfirm } from '@/app/(app)/_components/panel-ui';
import type { Availability } from '@/src/entities/models/availability';

/**
 * Confirma la baja de una Availability. La predeterminada y las que usa algún Servicio no se pueden eliminar:
 * en esos casos avisa por qué, en vez de confirmar.
 */
export function DeleteAvailabilityConfirm({
    open,
    onOpenChange,
    availability,
    usedBy,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availability: Availability;
    usedBy: number;
    onConfirm: () => void;
}) {
    const dialog = availability.isDefault
        ? {
              title: 'No podés eliminar tus horas laborables predeterminadas',
              description: 'Marcá otras como predeterminadas primero.',
          }
        : usedBy > 0
          ? {
                title: `No podés eliminar "${availability.name}"`,
                description: `${usedBy === 1 ? 'La usa 1 servicio' : `La usan ${usedBy} servicios`}. Cambiales las horas laborables antes de eliminarla.`,
            }
          : {
                title: '¿Eliminar estas horas laborables?',
                description: `"${availability.name}" se elimina para siempre.`,
                confirmLabel: 'Eliminar',
            };

    return (
        <PanelConfirm
            open={open}
            onOpenChange={onOpenChange}
            {...dialog}
            cancelLabel={'confirmLabel' in dialog ? 'Cancelar' : 'Entendido'}
            destructive
            onConfirm={onConfirm}
        />
    );
}
