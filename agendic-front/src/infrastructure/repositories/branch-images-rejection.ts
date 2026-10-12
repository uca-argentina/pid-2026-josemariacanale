import { BranchImagesRejectedError, type BranchImagesRejection } from '@/src/entities/errors/business';

/** Por qué el back rechazó las imágenes, por el status y el mensaje que ADR 0007 documenta; `null` si no son ellas. */
function rejectionOf(status: number, message: string): BranchImagesRejection | null {
    if (status === 413) return 'size';
    if (status !== 400) return null;
    if (message === 'La imagen tiene que ser JPEG, PNG, WebP o GIF') return 'type';
    if (message === 'At least one image is required' || message === 'Unexpected field - images') return 'count';
    return null;
}

/**
 * Traduce el rechazo de las imágenes de una Sucursal nueva (sola o con su Negocio) a su error de dominio; si la
 * respuesta no es eso, no hace nada.
 *
 * @throws {BranchImagesRejectedError} el back rechazó las imágenes por su tipo, su peso o cuántas son
 */
export function throwIfBranchImagesRejected(status: number, message: string): void {
    const reason = rejectionOf(status, message);
    if (reason) throw new BranchImagesRejectedError(message, { reason });
}
