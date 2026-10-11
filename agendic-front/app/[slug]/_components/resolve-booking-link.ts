import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

/**
 * De quién es el primer tramo de un Enlace de reserva (ADR 0026). La metadata y la página piden lo mismo: una sola
 * llamada al back por request. Un tramo que nadie tiene, o mal formado, es página no encontrada; si el back falla,
 * `null` y la página muestra el aviso de error.
 *
 * @throws {NotFoundError} vía `notFound()`, cuando nadie tiene el tramo o no tiene formato de Enlace de reserva
 */
export const resolveBookingLink = cache(async (slug: string) => {
    try {
        return await getInjection('IResolveBookingLinkController')({ slug });
    } catch (error) {
        if (error instanceof NotFoundError || error instanceof InputParseError) notFound();
        getInjection('ICrashReporterService').report(error);
        return null;
    }
});
