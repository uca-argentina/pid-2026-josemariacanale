/** Tipos que el back acepta para una imagen (ticket #144). */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Recorta los archivos elegidos a los lugares que quedan hasta el tope.
 *
 * @returns `accepted` los primeros que entran y `dropped` cuántos quedaron afuera
 */
export function takeUpToLimit<T>(files: readonly T[], max: number, current: number): { accepted: T[]; dropped: number } {
    const room = Math.max(0, max - current);
    return { accepted: files.slice(0, room), dropped: Math.max(0, files.length - room) };
}
