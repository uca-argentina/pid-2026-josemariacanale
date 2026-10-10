import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeleteBranchImageUseCase } from '../../application/branch-images/delete-branch-image.use-case';
import { ListBranchImagesUseCase } from '../../application/branch-images/list-branch-images.use-case';
import { ReorderBranchImagesUseCase } from '../../application/branch-images/reorder-branch-images.use-case';
import { UploadBranchImageUseCase } from '../../application/branch-images/upload-branch-image.use-case';
import { FileUpload } from '../../domain/file-storage';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentBranchImage } from './branch-image.presenter';
import { ReorderBranchImagesDto } from './branch-images.dto';
import { ImageFilePipe, MAX_IMAGE_BYTES } from './image-file.pipe';

@Controller()
export class BranchImagesController {
  constructor(
    private readonly listBranchImagesUseCase: ListBranchImagesUseCase,
    private readonly uploadBranchImageUseCase: UploadBranchImageUseCase,
    private readonly deleteBranchImageUseCase: DeleteBranchImageUseCase,
    private readonly reorderBranchImagesUseCase: ReorderBranchImagesUseCase,
  ) {}

  @Get('branches/:id/images')
  async list(@Param('id', ParseIntPipe) branchId: number) {
    return (await this.listBranchImagesUseCase.execute(branchId)).map(
      presentBranchImage,
    );
  }

  /** Multipart, with the image in the `file` field; over the size limit is a 413. */
  @Post('branches/:id/images')
  @UseGuards(ClerkGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  async upload(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) branchId: number,
    @UploadedFile(ImageFilePipe) file: FileUpload,
  ) {
    return presentBranchImage(
      await this.uploadBranchImageUseCase.execute(userId, branchId, file),
    );
  }

  @Delete('branches/:id/images/:imageId')
  @UseGuards(ClerkGuard)
  @HttpCode(204)
  async delete(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) branchId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    await this.deleteBranchImageUseCase.execute(userId, branchId, imageId);
  }

  @Put('branches/:id/images/order')
  @UseGuards(ClerkGuard)
  async reorder(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) branchId: number,
    @Body() dto: ReorderBranchImagesDto,
  ) {
    return (
      await this.reorderBranchImagesUseCase.execute(
        userId,
        branchId,
        dto.imageIds,
      )
    ).map(presentBranchImage);
  }
}
