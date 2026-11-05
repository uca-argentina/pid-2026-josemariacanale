import type { Location } from '@/src/entities/models/branch';

/** La Ubicación de una Sucursal (ADR 0037): su dirección y su punto, `null` en una Sucursal anterior a la Ubicación. */
export type Ubicacion = { address: string; location: Location | null };

/** Arma el enlace "Cómo llegar": la ruta de Google Maps hasta el punto de la Sucursal, o hasta su dirección si no tiene. */
export function directionsUrl({ address, location }: Ubicacion): string {
    const destination = location ? `${location.lat},${location.lng}` : encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
