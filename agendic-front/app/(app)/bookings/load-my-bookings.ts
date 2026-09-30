import { cache } from 'react';
import { getInjection } from '@/di/container';

/**
 * Los Turnos del Empleado logueado, pedidos una sola vez por request: el layout (contador de pendientes)
 * y la página comparten la misma consulta.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {ApiRequestError} la API falló
 */
export const loadMyBookings = cache(() => getInjection('IListMyBookingsController')());
