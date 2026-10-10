import { z } from 'zod';

// An Imagen de Sucursal as GET /branches/:id/images returns it. `url` points to the external
// storage (ADR 0015); `order` is its place in the gallery, and the back already sorts by it.
export const branchImageSchema = z.object({
    id: z.number(),
    branchId: z.number(),
    url: z.string(),
    order: z.number(),
});
export type BranchImage = z.infer<typeof branchImageSchema>;

// What the controllers of Imágenes de Sucursal take: the Sucursal and the file or the new order.
export const uploadBranchImageSchema = z.object({ branchId: z.number(), file: z.instanceof(File) });
export const deleteBranchImageSchema = z.object({ branchId: z.number(), imageId: z.number() });
export const reorderBranchImagesSchema = z.object({ branchId: z.number(), imageIds: z.array(z.number()) });
