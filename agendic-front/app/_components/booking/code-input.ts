/** Cuántas casillas tiene el Código de verificación: una por carácter (ADR 0006). */
export const CODE_LENGTH = 6;

/** Casillas vacías, el estado inicial y el de después de un código que no sirvió. */
export const EMPTY_CODE: readonly string[] = Array<string>(CODE_LENGTH).fill('');

/** Deja solo los caracteres del alfabeto del Código de verificación, en mayúsculas. */
export const sanitizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z2-9]/g, '');

/**
 * Escribe `raw` en las casillas desde `index` y dice en cuál queda el foco: un carácter salta a la siguiente, y
 * un código pegado llena las que entren desde ahí. Lo que sobra se descarta.
 */
export function writeCode(chars: readonly string[], index: number, raw: string): { chars: string[]; focus: number } {
    const typed = sanitizeCode(raw).slice(0, CODE_LENGTH - index);
    const next = [...chars];
    for (let i = 0; i < typed.length; i++) next[index + i] = typed[i];
    return { chars: next, focus: Math.min(index + typed.length, CODE_LENGTH - 1) };
}
