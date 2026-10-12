import { Cabin } from './cabin';

export const CABINS_REPOSITORY = Symbol('CabinsRepository');

export interface CabinsRepository {
  /** Ascending by name, ties by id; the ones dadas de baja are left out. */
  listActiveByBranch(branchId: number): Promise<Cabin[]>;
  /** Also finds the ones dadas de baja. */
  findById(id: number): Promise<Cabin | null>;
  /** @throws {ConflictError} another active Cabina of the Sucursal has the name, ignoring case */
  create(branchId: number, name: string): Promise<Cabin>;
  /** @throws {ConflictError} another active Cabina of the Sucursal has the name, ignoring case */
  rename(cabin: Cabin, name: string): Promise<Cabin>;
  /** Sets `deletedAt`; the row is kept. */
  retire(id: number): Promise<void>;
}
