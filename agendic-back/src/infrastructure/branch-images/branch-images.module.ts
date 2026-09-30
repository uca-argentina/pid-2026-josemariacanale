import { Module } from '@nestjs/common';
import { DeleteBranchImageUseCase } from '../../application/branch-images/delete-branch-image.use-case';
import { ListBranchImagesUseCase } from '../../application/branch-images/list-branch-images.use-case';
import { ReorderBranchImagesUseCase } from '../../application/branch-images/reorder-branch-images.use-case';
import { UploadBranchImageUseCase } from '../../application/branch-images/upload-branch-image.use-case';
import { UsersModule } from '../users/users.module';
import { BranchImagesController } from './branch-images.controller';

@Module({
  imports: [UsersModule],
  controllers: [BranchImagesController],
  providers: [
    ListBranchImagesUseCase,
    UploadBranchImageUseCase,
    DeleteBranchImageUseCase,
    ReorderBranchImagesUseCase,
  ],
})
export class BranchImagesModule {}
