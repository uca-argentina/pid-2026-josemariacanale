import { z } from 'zod';

/** El nombre de una Cabina: requerido y de hasta 60 caracteres, como lo valida el back (ADR 0030). */
export const CABIN_NAME_MAX = 60;
const cabinName = z.string().trim().min(1).max(CABIN_NAME_MAX);

/** Una Cabina de una Sucursal, como la devuelve GET /branches/:id/cabins. Solo la ve el Dueño. */
export const cabinSchema = z.object({
    id: z.number(),
    branchId: z.number(),
    name: cabinName,
});
export type Cabin = z.infer<typeof cabinSchema>;

/** La forma exacta que espera POST /branches/:id/cabins, más el branchId que va en la ruta. */
export const createCabinSchema = z.object({ branchId: z.number(), name: cabinName });
export type CreateCabin = z.infer<typeof createCabinSchema>;

/** La forma exacta que espera PATCH /cabins/:id, más el id que va en la ruta. */
export const renameCabinSchema = z.object({ id: z.number(), name: cabinName });
export type RenameCabin = z.infer<typeof renameCabinSchema>;
