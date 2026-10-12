import { Cabin } from '../../domain/cabins/cabin';

/** The Cabina as the panel sees it: `deletedAt` stays internal. */
export const presentCabin = (cabin: Cabin) => ({
  id: cabin.id,
  branchId: cabin.branchId,
  name: cabin.name,
});
