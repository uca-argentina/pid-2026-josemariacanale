'use server';

import { getInjection } from '@/di/container';
import { NotFoundError, ValidationError, ApiRequestError, InputParseError } from '@/src/entities/errors/common';

export interface GetSlotsResponse {
    timeZone?: string;
    days?: Array<{
        date: string;
        slots: string[];
        reason?: 'NOT_WORKING' | 'FULLY_BOOKED' | 'COVERED';
        coveredByEmployeeId?: number | null;
    }>;
    error?: string;
}

export async function getSlotsAction(input: {
    serviceId: number;
    employeeId: number;
    from: string;
    to: string;
}): Promise<GetSlotsResponse> {
    try {
        const controller = getInjection('IGetSlotsController');
        const result = await controller(input);
        return {
            timeZone: result.timeZone,
            days: result.days,
        };
    } catch (err) {
        if (err instanceof NotFoundError) {
            return { error: err.message || 'Servicio o profesional no encontrado' };
        }
        if (err instanceof ValidationError) {
            return { error: err.message || 'Rango de fechas no válido' };
        }
        if (err instanceof InputParseError) {
            return { error: 'Parámetros de búsqueda inválidos' };
        }
        if (err instanceof ApiRequestError) {
            return { error: err.message || 'Error al comunicarse con el servidor' };
        }
        return { error: 'Ocurrió un error inesperado al consultar los horarios' };
    }
}
