import { getInjection } from '@/di/container';

/** Lo que devuelve `back()`: los datos, o el status y el mensaje que mandó el back. */
export type BackResult<T = unknown> = { ok: true; data: T } | { ok: false; status: number; message: string };

/**
 * Llama al back desde el servidor (Server Component o Server Action). Nunca tira: devuelve `ok: false` con el
 * `message` del back, así la pantalla lo puede mostrar tal cual. Con `auth: true` manda el token de la Sesión.
 */
export async function back<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    { body, auth = false }: { body?: unknown; auth?: boolean } = {},
): Promise<BackResult<T>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) headers.Authorization = `Bearer ${await getInjection('IAuthenticationService').getAccessToken()}`;

    let response: Response;
    try {
        response = await fetch(`${process.env.API_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (cause) {
        console.error(`${method} ${path} failed`, cause);
        return { ok: false, status: 0, message: 'No se pudo conectar con el back. ¿Está levantado?' };
    }

    const json = await response.json().catch(() => undefined);
    if (!response.ok) {
        const message = json?.message ?? `${method} ${path} respondió ${response.status}`;
        return { ok: false, status: response.status, message: Array.isArray(message) ? message.join(', ') : String(message) };
    }
    return { ok: true, data: json as T };
}
