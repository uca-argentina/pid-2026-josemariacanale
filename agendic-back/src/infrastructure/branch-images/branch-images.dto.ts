import { ArrayUnique, IsArray, IsInt } from 'class-validator';

/** The Sucursal's whole list of images, in the order wanted. */
export class ReorderBranchImagesDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  imageIds!: number[];
}
