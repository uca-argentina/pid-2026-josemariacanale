'use client';

import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelIconButton } from '@/app/(app)/_components/panel-ui';
import { bookingLink } from '@/app/(app)/_components/booking-link';

/** Copia el Enlace de reserva del Negocio al portapapeles. */
export function CopyBookingLinkButton({ slug }: { slug: string }) {
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`https://${bookingLink(slug)}`);
            toast.success('Enlace de reserva copiado');
        } catch {
            toast.error('No se pudo copiar el Enlace de reserva');
        }
    };

    return (
        <PanelIconButton label="Copiar Enlace de reserva" onClick={copyLink}>
            <Link2 />
        </PanelIconButton>
    );
}
