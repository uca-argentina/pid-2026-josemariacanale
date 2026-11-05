import type { Location } from '@/src/entities/models/branch';

/**
 * Arma el enlace "Cómo llegar" de una Sucursal: la ruta de Google Maps hasta su punto, o hasta su dirección si no tiene
 * (una Sucursal anterior a la Ubicación, ADR 0037).
 */
export function directionsUrl({ address, location }: { address: string; location: Location | null }): string {
    const destination = location ? `${location.lat},${location.lng}` : encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
