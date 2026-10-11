/**
 * Primeros tramos del front que no pueden ser el Enlace de reserva de un Negocio ni de un Usuario: son pantallas
 * del panel o de Agendic (ADR 0026). Toda ruta nueva de primer nivel del front se suma acá. La Sucursal y el
 * Servicio pueden usarlas: no ocupan el primer tramo.
 */
export const RESERVED_SLUGS: readonly string[] = [
  'bookings',
  'services',
  'business',
  'availability',
  'analytics',
  'turnos',
  'sign-in',
  'sign-up',
  'api',
  'trpc',
  'u',
];

/** `slug` ya viene en minúsculas, como lo deja el DTO. */
export const isReservedSlug = (slug: string) => RESERVED_SLUGS.includes(slug);
