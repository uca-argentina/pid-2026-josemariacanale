import { ConflictError } from '../errors';
import { isReservedSlug } from './reserved-slugs';

/**
 * Rechaza una palabra reservada como Enlace de reserva del Negocio o del Usuario. La unicidad contra otro Negocio o
 * Usuario no se chequea acá: la hace Postgres (ADR 0004, 0026).
 *
 * @throws {ConflictError} el slug es una palabra reservada
 */
export const assertNotReservedSlug = (slug: string | undefined) => {
  if (slug !== undefined && isReservedSlug(slug))
    throw new ConflictError('Booking link already in use');
};
