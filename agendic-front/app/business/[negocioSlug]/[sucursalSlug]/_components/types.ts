// Las formas que la página de la Sucursal recibe por props: la salida del presenter de
// getPublicBranchController, así el server nunca baja más de lo que la página muestra. Las del flujo de Reservar
// están en app/_components/booking/types.ts.
// Identificadores en inglés, uno por término del glosario (ADR 0003, docs/agents/domain.md).

import type { DI_RETURN_TYPES } from '@/di/types';

export type PublicBranchPage = Awaited<ReturnType<DI_RETURN_TYPES['IGetPublicBranchController']>>;

export type Business = PublicBranchPage['business'];
export type Branch = PublicBranchPage['branch'];
/** Las demás Sucursales del mismo Negocio, con su tramo del Enlace de reserva. */
export type OtherBranch = PublicBranchPage['otherBranches'][number];
/** Lo único que la vista pública conoce de un Empleado: el email es solo del Dueño. */
export type Employee = PublicBranchPage['employees'][number];
/** Imágenes de Sucursal, ya en el orden de la galería. */
export type BranchImage = PublicBranchPage['images'][number];
