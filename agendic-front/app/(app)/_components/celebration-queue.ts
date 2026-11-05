/**
 * Qué pasa al cerrar el modal `index` de una fila de `total`: la posición del siguiente y si era el último, que es
 * cuando se marcan todos como vistos (y no antes, para que una recarga a mitad de fila los vuelva a celebrar).
 */
export function closeCelebration(index: number, total: number) {
    return { next: index + 1, markSeen: index >= total - 1 };
}
