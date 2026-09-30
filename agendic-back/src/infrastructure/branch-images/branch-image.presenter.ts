import { BranchImage } from '../../domain/branch-images/branch-image';

export const presentBranchImage = (image: BranchImage) => ({
  id: image.id,
  branchId: image.branchId,
  url: image.url,
  order: image.order,
});
