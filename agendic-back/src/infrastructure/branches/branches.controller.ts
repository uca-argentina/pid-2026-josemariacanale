import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { CreateBranchUseCase } from '../../application/branches/create-branch.use-case';
import { ListBranchesByBusinessUseCase } from '../../application/branches/list-branches-by-business.use-case';
import { UpdateBranchUseCase } from '../../application/branches/update-branch.use-case';
import { FileUpload } from '../../domain/file-storage';
import {
  ImageFilesPipe,
  UseBranchImagesInterceptor,
} from '../branch-images/image-file.pipe';
import { MultipartJson } from '../multipart-json';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentBranch, presentBranchWithImages } from './branch.presenter';
import { CreateBranchDto, UpdateBranchDto } from './branches.dto';

@Controller()
export class BranchesController {
  constructor(
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly updateBranchUseCase: UpdateBranchUseCase,
    private readonly listBranchesByBusinessUseCase: ListBranchesByBusinessUseCase,
  ) {}

  /**
   * Multipart: the Sucursal's fields as JSON in `data`, and 1 to 5 images in `images`; an image over the size
   * limit is a 413, more than five files a 400.
   */
  @Post('businesses/:businessId/branches')
  @UseGuards(ClerkGuard)
  @UseBranchImagesInterceptor()
  async create(
    @CurrentUser() userId: number,
    @Param('businessId', ParseIntPipe) businessId: number,
    @MultipartJson('data', CreateBranchDto) dto: CreateBranchDto,
    @UploadedFiles(ImageFilesPipe) images: FileUpload[],
  ) {
    return presentBranchWithImages(
      await this.createBranchUseCase.execute(userId, businessId, dto, images),
    );
  }

  @Patch('branches/:id')
  @UseGuards(ClerkGuard)
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
  ) {
    return presentBranch(
      await this.updateBranchUseCase.execute(userId, id, dto),
    );
  }

  @Get('businesses/:businessId/branches')
  async list(@Param('businessId', ParseIntPipe) businessId: number) {
    return (await this.listBranchesByBusinessUseCase.execute(businessId)).map(
      presentBranch,
    );
  }
}
