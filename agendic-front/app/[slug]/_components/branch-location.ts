import type { Ubicacion } from '@/app/_components/maps/directions';
import type { Location } from '@/src/entities/models/branch';

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
 * Ordena las Sucursales de la más cercana a `origin` a la más lejana, cada una con su distancia en km.
 *
 * Las que no tienen punto no tienen distancia y quedan al final, en el orden en que vinieron. Sin `origin` (el Cliente
 * no compartió su ubicación) quedan todas como vinieron.
 */
export function sortByDistance<T extends Ubicacion>(
    branches: T[],
    origin: Location | null,
): (T & { distanceKm: number | null })[] {
    return branches
        .map((branch) => ({
            ...branch,
            distanceKm: origin && branch.location ? distanceKm(origin, branch.location) : null,
        }))
        // Stable sort: equal keys (two without a distance) keep their order.
        .sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE));
}
