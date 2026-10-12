import type { BranchImagesRejection } from '@/src/entities/errors/business';

/** Qué decirle al Dueño cuando el back rechaza las imágenes de una Sucursal nueva, sola o con su Negocio. */
export const BRANCH_IMAGES_REJECTED: Record<BranchImagesRejection, string> = {
    type: 'Las imágenes tienen que ser JPEG, PNG, WebP o GIF.',
    size: 'Cada imagen puede pesar hasta 5 MB.',
    count: 'Elegí entre una y cinco imágenes.',
};
