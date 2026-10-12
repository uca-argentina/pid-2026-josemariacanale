import { Cabin } from './cabin';

/** Injection token for the {@link CabinsRepository} port. */
export const CABINS_REPOSITORY = Symbol('CabinsRepository');

/** Cabinas of a Sucursal; authorization is the use cases' job. */
export interface CabinsRepository {
  /** Ascending by name, ties by id; the ones dadas de baja are left out. */
  listActiveByBranch(branchId: number): Promise<Cabin[]>;
  /** Also finds the ones dadas de baja. */
  findById(id: number): Promise<Cabin | null>;
  /** @throws {ConflictError} another active Cabina of the Sucursal has the name, ignoring case */
  create(branchId: number, name: string): Promise<Cabin>;
  /** @throws {ConflictError} another active Cabina of the Sucursal has the name, ignoring case */
  rename(cabin: Cabin, name: string): Promise<Cabin>;
  /** Sets `deletedAt`, keeping the row, and takes the Cabina out of every Servicio that admitted it. */
  retire(id: number): Promise<void>;
}
