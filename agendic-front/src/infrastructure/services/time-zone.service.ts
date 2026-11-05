import type { ITimeZoneService } from '@/src/application/services/time-zone.service.interface';
import { ApiRequestError } from '@/src/entities/errors/common';
import type { Location } from '@/src/entities/models/branch';

/**
 * Zona horaria de un punto con la Time Zone API de Google (ADR 0037).
 *
 * Corre en el servidor con una key propia: es un web service, y Google no lo acepta con la key del navegador,
 * restringida por dominio.
 */
export class TimeZoneService implements ITimeZoneService {
    constructor(private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY) {}

    /** @throws {ApiRequestError} falta la key, Google no responde o no tiene zona para el punto */
    async getTimeZoneAt({ lat, lng }: Location): Promise<string> {
        if (!this.apiKey) throw new ApiRequestError('GOOGLE_MAPS_API_KEY is not set');
        const query = new URLSearchParams({
            location: `${lat},${lng}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            key: this.apiKey,
        });

        let body: { status?: string; timeZoneId?: string; error_message?: string };
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/timezone/json?${query}`);
            body = await response.json();
        } catch {
            // Sin `cause`: el error de fetch lleva la URL, y la URL lleva la key.
            throw new ApiRequestError(`Time Zone API failed for ${lat},${lng}`);
        }

        if (body.status !== 'OK' || !body.timeZoneId) {
            throw new ApiRequestError(`Time Zone API answered ${body.status} for ${lat},${lng}: ${body.error_message ?? ''}`.trim());
        }
        return body.timeZoneId;
    }
}
