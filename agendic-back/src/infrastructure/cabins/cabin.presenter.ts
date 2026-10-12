import { Cabin } from '../../domain/cabins/cabin';

export const presentCabin = (cabin: Cabin) => ({
  id: cabin.id,
  branchId: cabin.branchId,
  name: cabin.name,
});
