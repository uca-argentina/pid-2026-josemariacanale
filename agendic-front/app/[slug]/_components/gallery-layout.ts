/** Cuántas Imágenes entran en una fila del modal de fotos: una a todo el ancho, o dos a mitad cada una. */
export type GalleryRow = 1 | 2;

/** Qué muestra la galería de una Sucursal, por posición en su lista de Imágenes. */
export type GalleryLayout = {
    /** El mosaico desde md: la portada (2fr) y lo que va a su costado (1fr), apilado si son dos. */
    mosaic: { cover: number; side: number[] };
    /** Si se muestra "Ver todas las fotos": con una sola Imagen no hay nada más que ver. */
    showAll: boolean;
    /** Las filas del modal, en orden; suman `count`. */
    modalRows: GalleryRow[];
};

/**
 * Arma la galería para `count` Imágenes (al menos una: la Sucursal nunca queda sin Imágenes). Con una, el costado
 * repite la portada; con dos, la segunda va a altura completa; desde tres, la segunda y la tercera apiladas. Las filas
 * del modal alternan 1 y 2, y si la última de 2 quedaría con una sola Imagen, se junta con la de 1 anterior.
 */
export function galleryLayout(count: number): GalleryLayout {
    const modalRows: GalleryRow[] = [];
    let left = count;
    while (left > 0) {
        const row: GalleryRow = modalRows.length % 2 === 0 ? 1 : 2;
        if (row === 2 && left === 1) {
            modalRows.pop();
            modalRows.push(2);
            break;
        }
        modalRows.push(row);
        left -= row;
    }
    return {
        mosaic: { cover: 0, side: count === 1 ? [0] : [1, 2].filter((index) => index < count) },
        showAll: count >= 2,
        modalRows,
    };
}

/** Reparte `items` en las filas `rows` de `galleryLayout`, en orden: la fila i lleva `rows[i]` de ellos. */
export function splitIntoRows<T>(items: readonly T[], rows: readonly GalleryRow[]): T[][] {
    const result: T[][] = [];
    let start = 0;
    for (const size of rows) {
        result.push(items.slice(start, start + size));
        start += size;
    }
    return result;
}

/** El contador de la galería oscura, "n/N": la Imagen `index` (desde 0) de `total`. */
export const slideCounter = (index: number, total: number) => `${index + 1}/${total}`;
