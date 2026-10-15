const SERIES_CONFLICT = /^Series dates not available: (.+)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Las fechas del 409 de una Serie (ADR 0007): `Series dates not available: <YYYY-MM-DD>,<YYYY-MM-DD>`. `null` si el
 * mensaje no es ese, por ejemplo el 409 de un Turno suelto con el horario tomado.
 */
export function seriesConflictDates(message: string): string[] | null {
    const match = SERIES_CONFLICT.exec(message);
    if (!match) return null;
    const dates = match[1].split(',').map((d) => d.trim());
    return dates.length > 0 && dates.every((d) => DATE.test(d)) ? dates : null;
}
