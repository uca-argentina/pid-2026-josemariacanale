/**
 * Modo offline, solo para desarrollo: con `NEXT_PUBLIC_AUTH_OFFLINE=true` no se habla con Clerk. La Sesión es una cookie
 * con el clerkId del Usuario, y el back (con `AUTH_OFFLINE=true`) acepta `Bearer dev:<clerkId>` sin verificar nada.
 */
export const AUTH_OFFLINE = process.env.NEXT_PUBLIC_AUTH_OFFLINE === 'true';

/** La cookie que guarda el clerkId de la Sesión offline. */
export const OFFLINE_SESSION_COOKIE = 'agendic-offline-session';

/** El token que el back acepta en modo offline para ese clerkId. */
export const offlineAccessToken = (clerkId: string) => `dev:${clerkId}`;
