import type { Location } from '@/src/entities/models/branch';

/** Lo que hace falta de una Sucursal para llegar a ella: el punto, si tiene, y la dirección. */
type Place = { address: string; location: Location | null };

const EARTH_RADIUS_KM = 6371;

/** Distancia en línea recta (haversine) entre dos puntos, en km. */
function distanceKm(a: Location, b: Location): number {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Las Sucursales de la más cercana a `origin` a la más lejana, cada una con su distancia en km. Las que no tienen punto
 * no tienen distancia: quedan al final, en el orden en que vinieron.
 */
export function sortByDistance<T extends Place>(branches: T[], origin: Location): (T & { distanceKm: number | null })[] {
    return branches
        .map((branch) => ({ ...branch, distanceKm: branch.location ? distanceKm(origin, branch.location) : null }))
        // Stable sort: equal keys (two without a punto) keep their order.
        .sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE));
}

/** El enlace "Cómo llegar": Google Maps con la ruta hasta el punto de la Sucursal, o hasta su dirección si no tiene. */
export function directionsUrl({ address, location }: Place): string {
    const destination = location ? `${location.lat},${location.lng}` : encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
