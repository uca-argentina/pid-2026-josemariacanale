import type { Location } from '@/src/entities/models/branch';

/** La zona horaria de un punto del mapa. */
export interface ITimeZoneService {
    /**
     * Devuelve el nombre IANA de la zona horaria del punto, hoy.
     *
     * @throws {ApiRequestError} el proveedor no respondió o no tiene zona para ese punto
     */
    getTimeZoneAt(location: Location): Promise<string>;
}
