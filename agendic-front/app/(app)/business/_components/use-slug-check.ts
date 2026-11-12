'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { businessSchema, type FieldErrors } from '@/app/_components/business-schemas';
import { checkSlugAction } from '../actions';

/** Los errores con el del Enlace de reserva puesto, o sacado si `error` es undefined. */
export const withSlugError = (errors: FieldErrors, error: string | undefined): FieldErrors => {
    const rest = Object.fromEntries(Object.entries(errors).filter(([field]) => field !== 'slug'));
    return error ? { ...rest, slug: error } : rest;
};

/**
 * Verifica el Enlace de reserva del Negocio: primero el formato, después si está libre en el back. Recuerda el último
 * slug pedido, así el blur y el "Continuar" que lo sigue comparten una sola llamada.
 *
 * @param slug el valor vigente del campo
 * @param setErrors los errores del formulario, donde queda el del Enlace de reserva
 * @param ownSlug el del Negocio que se edita: siempre vale y no se pregunta al back
 */
export function useSlugCheck(slug: string, setErrors: Dispatch<SetStateAction<FieldErrors>>, ownSlug?: string) {
    const last = useRef<{ slug: string; error: Promise<string | undefined> }>(undefined);
    const [checking, setChecking] = useState(false);
    // El slug vigente, para no pisar el campo con la respuesta de uno que ya cambió.
    const current = useRef(slug);
    useEffect(() => {
        current.current = slug;
    });

    /** El error para mostrar en el campo, o undefined si el slug se puede usar. */
    function check(raw: string): Promise<string | undefined> {
        const parsed = businessSchema.shape.slug.safeParse(raw);
        if (!parsed.success) return Promise.resolve(parsed.error.issues[0]?.message);
        const slug = parsed.data;
        if (slug === ownSlug) return Promise.resolve(undefined);
        if (last.current?.slug === slug) return last.current.error;

        setChecking(true);
        let failed = false;
        const error = checkSlugAction(slug)
            .then((result) => (result.ok ? undefined : result.message))
            .catch(() => {
                // La server action no respondió (red): no bloquea al Dueño; el alta y la edición lo vuelven a chequear.
                failed = true;
                return undefined;
            })
            .finally(() => {
                if (last.current?.slug !== slug) return;
                setChecking(false);
                if (failed) last.current = undefined; // la próxima vez se vuelve a preguntar
            });
        last.current = { slug, error };
        return error;
    }

    /** Verifica el Enlace de reserva vigente y muestra el error en el campo. Devuelve el error, o undefined si está libre o vacío. */
    async function verify(): Promise<string | undefined> {
        const slug = current.current;
        if (!slug.trim()) return undefined; // vacío: lo marca el envío del formulario, no el blur
        const error = await check(slug);
        if (current.current === slug) setErrors((errors) => withSlugError(errors, error));
        return error;
    }

    return { verify, checking };
}
