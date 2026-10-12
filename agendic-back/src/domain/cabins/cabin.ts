/** The longest a Cabina's name can be. */
export const MAX_CABIN_NAME_LENGTH = 60;

/** Espacio o equipo de una Sucursal que un Turno ocupa mientras dura (ADR 0030). */
export interface Cabin {
  id: number;
  branchId: number;
  name: string;
  /** Set once dada de baja; the row stays as history. */
  deletedAt: Date | null;
}
