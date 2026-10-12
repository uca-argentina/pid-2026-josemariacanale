import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { FileUpload } from '../../domain/file-storage';

/** What multer hands over for a multipart file field; only the parts read here. */
interface UploadedMultipartFile {
  buffer: Buffer;
  mimetype: string;
}

/** Size limit of an uploaded image (Sucursal images and Logo del Negocio); over it is a 413. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The formats every browser shows in an <img>. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const toImageUpload = (file: UploadedMultipartFile): FileUpload => {
  if (!IMAGE_TYPES.includes(file.mimetype))
    throw new BadRequestException(
      'La imagen tiene que ser JPEG, PNG, WebP o GIF',
    );
  return { content: file.buffer, contentType: file.mimetype };
};

/** Multer already enforced the size limit; a missing file or one that is not an image is a 400. */
@Injectable()
export class ImageFilePipe implements PipeTransform<
  UploadedMultipartFile | undefined,
  FileUpload
> {
  transform(file: UploadedMultipartFile | undefined): FileUpload {
    if (!file) throw new BadRequestException('file is required');
    return toImageUpload(file);
  }
}

/**
 * For a multipart field of several images, in the order received. Multer already enforced the size limit and the
 * most files; no file, or any file that is not an image, is a 400.
 *
 * @throws {BadRequestException} no llegó ningún archivo, o alguno no es JPEG, PNG, WebP o GIF
 */
@Injectable()
export class ImageFilesPipe implements PipeTransform<
  UploadedMultipartFile[] | undefined,
  FileUpload[]
> {
  transform(files: UploadedMultipartFile[] | undefined): FileUpload[] {
    if (!files?.length)
      throw new BadRequestException('At least one image is required');
    return files.map(toImageUpload);
  }
}
