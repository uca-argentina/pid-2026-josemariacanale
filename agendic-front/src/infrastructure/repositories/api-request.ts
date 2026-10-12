import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';

/** Error de dominio al que se traduce un status del back; recibe el `message` del back. */
export type ErrorByStatus = Record<number, new (message: string) => Error>;

/**
 * Llama a la API del back con el token de la Sesión y devuelve el cuerpo JSON (`undefined` si no hay).
 *
 * Traduce 401 a `UnauthenticatedError`, cada status de `errors` a su clase y cualquier otro no-OK, o una
 * falla de red, a `ApiRequestError` (con `cause` si es de red). El `Content-Type` solo va con `body`.
 *
 * @throws {UnauthenticatedError} el back respondió 401
 * @throws {ApiRequestError} falta `API_URL`, falla de red u otro status no-OK
 */
export async function apiRequest(
    authenticationService: IAuthenticationService,
    apiUrl: string | undefined,
    method: string,
    path: string,
    options: { body?: unknown; errors?: ErrorByStatus } = {},
) {
    return (await call(authenticationService, apiUrl, method, path, options)).json;
}

/** Como `apiRequest`, pero devuelve el cuerpo tal cual (para lo que no es JSON, como un CSV). */
export async function apiRequestText(
    authenticationService: IAuthenticationService,
    apiUrl: string | undefined,
    method: string,
    path: string,
    options: { body?: unknown; errors?: ErrorByStatus } = {},
): Promise<string> {
    return (await call(authenticationService, apiUrl, method, path, options)).text;
}

async function call(
    authenticationService: IAuthenticationService,
    apiUrl: string | undefined,
    method: string,
    path: string,
    { body, errors = {} }: { body?: unknown; errors?: ErrorByStatus },
) {
    const what = `${method} ${path}`;
    if (!apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);
    const token = await authenticationService.getAccessToken();

    let response: Response;
    try {
        response = await fetch(`${apiUrl}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(body !== undefined && { 'Content-Type': 'application/json' }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (cause) {
        throw new ApiRequestError(`${what} failed`, { cause });
    }

    const text = await response.text().catch(() => '');
    const json = (() => {
        try {
            return JSON.parse(text);
        } catch {
            return undefined;
        }
    })();
    const message = String(json?.message ?? `${what} responded ${response.status}`);
    if (response.status === 401) throw new UnauthenticatedError(message);
    const KnownError = errors[response.status];
    if (KnownError) throw new KnownError(message);
    if (!response.ok) throw new ApiRequestError(message, { status: response.status });
    return { json, text };
}
