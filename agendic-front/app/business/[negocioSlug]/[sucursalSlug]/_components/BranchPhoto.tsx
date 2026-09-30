import Image from 'next/image';
import { Building2 } from 'lucide-react';

// Una Imagen de Sucursal que llena su contenedor (que tiene que ser `relative`). Sin `src`, la
// Sucursal todavía no tiene Imágenes: fondo neutro en vez de una foto falsa.
// `unoptimized`: las Imágenes vienen del storage externo (ADR 0015), cuyo dominio es
// configuración del back, así que el front no puede listarlo en `images.remotePatterns`.
export function BranchPhoto({
    src,
    alt = '',
    sizes,
    priority,
}: {
    src: string | undefined;
    alt?: string;
    sizes: string;
    priority?: boolean;
}) {
    if (!src) {
        return (
            <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                <Building2 className="size-1/3 max-h-10 max-w-10" aria-hidden />
            </div>
        );
    }
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized className="object-cover" />;
}
