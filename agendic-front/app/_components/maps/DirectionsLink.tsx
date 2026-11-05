import { Navigation } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import { directionsUrl, type Ubicacion } from './directions';

/** Muestra el enlace "Cómo llegar" a una Sucursal, que abre la ruta de Google Maps en otra pestaña. */
export function DirectionsLink({ ubicacion, className }: { ubicacion: Ubicacion; className?: string }) {
    return (
        <a
            href={directionsUrl(ubicacion)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('inline-flex min-h-11 items-center gap-1.5 font-bold underline-offset-2 hover:underline', className)}
        >
            <Navigation aria-hidden className="size-4" />
            Cómo llegar
            <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
    );
}
