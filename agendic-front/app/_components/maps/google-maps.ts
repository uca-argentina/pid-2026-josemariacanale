'use client';

import { useEffect, useState } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** El Map ID que piden los marcadores avanzados; sin uno propio, el de prueba de Google (solo para desarrollo). */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

let loading: Promise<boolean> | undefined;
let authFailed = false;
const onAuthFailure = new Set<() => void>();

/**
 * Carga el SDK de Google Maps una sola vez por página (ADR 0037) y resuelve si quedó disponible. Sin la key resuelve
 * `false` sin pedir nada: el formulario sigue con la dirección en texto y sin mapa.
 */
export function loadGoogleMaps(): Promise<boolean> {
    if (!API_KEY || typeof window === 'undefined') return Promise.resolve(false);
    loading ??= new Promise<boolean>((resolve) => {
        const callback = '__agendicGoogleMapsReady';
        const globals = window as unknown as Record<string, () => void>;
        globals[callback] = () => resolve(!authFailed);
        // Google calls this when the key is invalid or not allowed for this domain; the script itself still loads.
        globals.gm_authFailure = () => {
            authFailed = true;
            onAuthFailure.forEach((notify) => notify());
        };
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
            key: API_KEY,
            v: 'weekly',
            loading: 'async',
            language: 'es',
            region: 'AR',
            callback,
        })}`;
        script.async = true;
        script.onerror = () => {
            loading = undefined; // a later mount can try again (e.g. offline for a moment)
            resolve(false);
        };
        document.head.append(script);
    });
    return loading;
}

/** `null` mientras carga; después, si el SDK está disponible. Pasa a `false` si Google rechaza la key. */
export function useGoogleMaps(): boolean | null {
    const [ready, setReady] = useState<boolean | null>(null);
    useEffect(() => {
        let alive = true;
        const fail = () => alive && setReady(false);
        onAuthFailure.add(fail);
        loadGoogleMaps().then((ok) => alive && setReady(ok && !authFailed));
        return () => {
            alive = false;
            onAuthFailure.delete(fail);
        };
    }, []);
    return ready;
}
