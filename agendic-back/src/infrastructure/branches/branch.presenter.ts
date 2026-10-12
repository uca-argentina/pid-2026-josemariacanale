import { Branch, BranchWithImages } from '../../domain/branches/branch';
import { presentBranchImage } from '../branch-images/branch-image.presenter';

export const presentBranch = (branch: Branch) => ({
  id: branch.id,
  businessId: branch.businessId,
  name: branch.name,
  address: branch.address,
  timeZone: branch.timeZone,
  slug: branch.slug,
  description: branch.description,
});

/** A Sucursal as `presentBranch`, plus its images in order. */
export const presentBranchWithImages = ({
  branch,
  images,
}: BranchWithImages) => ({
  ...presentBranch(branch),
  images: images.map(presentBranchImage),
});
