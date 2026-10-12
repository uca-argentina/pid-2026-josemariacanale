'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/_components/ui/button';

/**
 * Comparte el Enlace de reserva de una Sucursal: con el menú nativo de compartir donde existe y, si no, copiándolo al
 * portapapeles. Cerrar el menú nativo sin elegir nada no es un error; si el menú nativo falla por otra cosa (permisos,
 * un iframe), también lo copia.
 *
 * @param path la ruta del Enlace de reserva de la Sucursal en este mismo front, sin tramo de Servicio
 * @param title lo que el menú nativo muestra como título de lo compartido
 */
export function ShareBranchButton({ path, title }: { path: string; title: string }) {
    const share = async () => {
        const url = `${window.location.origin}${path}`;
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title, url });
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Enlace copiado');
        } catch {
            toast.error('No se pudo copiar el enlace');
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={share}
            aria-label="Compartir"
            className="size-11 shrink-0 rounded-full border-border"
        >
            <Share2 className="size-[18px]" />
        </Button>
    );
}
