import { ExternalServiceError } from '../domain/errors';

/** Resultado de geocodificar una dirección; `none` deja la Sucursal sin punto, para que el Dueño la complete desde el panel. */
export type GeocodeResult =
  | { kind: 'found'; latitude: number; longitude: number }
  | { kind: 'none'; reason: string };

interface GeocodingResponse {
  status: string;
  error_message?: string;
  results?: {
    geometry: {
      location: { lat: number; lng: number };
      location_type: string;
    };
  }[];
}

/**
 * Pasa una dirección por la Geocoding API de Google y devuelve su primer resultado.
 *
 * Un resultado `APPROXIMATE` no sirve como punto de una Sucursal (ADR 0037): se
 * devuelve como `none` para que el Dueño lo complete desde el panel.
 *
 * @throws {ExternalServiceError} Google no responde o rechazó el pedido (key inválida, cuota)
 */
export async function geocodeAddress(
  key: string,
  address: string,
): Promise<GeocodeResult> {
  const query = new URLSearchParams({ address, key });
  let data: GeocodingResponse;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${query}`,
    );
    data = (await response.json()) as GeocodingResponse;
  } catch {
    // Sin `cause`: la URL del pedido lleva la key y no debe llegar al log.
    throw new ExternalServiceError(
      `Geocoding API not reachable for "${address}"`,
    );
  }
  if (data.status === 'ZERO_RESULTS') {
    return { kind: 'none', reason: 'sin resultado' };
  }
  if (data.status !== 'OK' || !data.results?.length) {
    throw new ExternalServiceError(
      `Geocoding API failed for "${address}": ${data.status}: ${data.error_message ?? 'sin detalle'}`,
    );
  }
  const { location, location_type } = data.results[0].geometry;
  if (location_type === 'APPROXIMATE') {
    return { kind: 'none', reason: 'baja precisión (APPROXIMATE)' };
  }
  return { kind: 'found', latitude: location.lat, longitude: location.lng };
}

/** Sucursal sin punto que el script intenta completar. */
export interface BranchToGeocode {
  id: number;
  name: string;
  address: string;
}

/** Lo que imprime el script: cuántas completó y cuáles quedaron sin punto, con el motivo. */
export interface GeocodeReport {
  completed: number;
  failed: (BranchToGeocode & { reason: string })[];
}

/**
 * Geocodifica cada Sucursal y guarda el punto de las que dan un resultado preciso.
 *
 * @param save devuelve `false` si no escribió (la Sucursal ya tenía punto)
 * @throws {ExternalServiceError} Google rechazó el pedido o no responde; corta la corrida
 */
export async function geocodeBranches(
  branches: BranchToGeocode[],
  geocode: (address: string) => Promise<GeocodeResult>,
  save: (id: number, latitude: number, longitude: number) => Promise<boolean>,
): Promise<GeocodeReport> {
  const report: GeocodeReport = { completed: 0, failed: [] };
  for (const branch of branches) {
    const result = await geocode(branch.address);
    if (result.kind === 'found') {
      // `false`: el Dueño cargó el punto mientras corría, no es una completada nuestra.
      if (await save(branch.id, result.latitude, result.longitude)) {
        report.completed++;
      }
    } else {
      report.failed.push({ ...branch, reason: result.reason });
    }
  }
  return report;
}
