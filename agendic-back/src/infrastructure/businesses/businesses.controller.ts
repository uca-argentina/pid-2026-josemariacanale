import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateBusinessUseCase } from '../../application/businesses/create-business.use-case';
import { GetBusinessBySlugUseCase } from '../../application/businesses/get-business-by-slug.use-case';
import { GetBusinessUseCase } from '../../application/businesses/get-business.use-case';
import { ListBusinessesByOwnerUseCase } from '../../application/businesses/list-businesses-by-owner.use-case';
import { RemoveBusinessLogoUseCase } from '../../application/businesses/remove-business-logo.use-case';
import { SetBusinessLogoUseCase } from '../../application/businesses/set-business-logo.use-case';
import { UpdateBusinessUseCase } from '../../application/businesses/update-business.use-case';
import { FileUpload } from '../../domain/file-storage';
import { ImageFilePipe, MAX_IMAGE_BYTES } from '../branch-images/image-file.pipe';
import { presentBranch } from '../branches/branch.presenter';
import { presentEmployee } from '../employees/employee.presenter';
import { presentService } from '../services/service.presenter';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentBusiness } from './business.presenter';
import { CreateBusinessDto, UpdateBusinessDto } from './businesses.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly createBusinessUseCase: CreateBusinessUseCase,
    private readonly updateBusinessUseCase: UpdateBusinessUseCase,
    private readonly setBusinessLogoUseCase: SetBusinessLogoUseCase,
    private readonly removeBusinessLogoUseCase: RemoveBusinessLogoUseCase,
    private readonly listBusinessesByOwnerUseCase: ListBusinessesByOwnerUseCase,
    private readonly getBusinessUseCase: GetBusinessUseCase,
    private readonly getBusinessBySlugUseCase: GetBusinessBySlugUseCase,
  ) {}

  @Post()
  @UseGuards(ClerkGuard)
  async create(@CurrentUser() userId: number, @Body() dto: CreateBusinessDto) {
    const created = await this.createBusinessUseCase.execute(userId, dto);
    return {
      business: presentBusiness(created.business),
      branch: presentBranch(created.branch),
      service: created.service && presentService(created.service),
      employee: presentEmployee(created.employee),
    };
  }

  @Patch(':id')
  @UseGuards(ClerkGuard)
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessDto,
  ) {
    return presentBusiness(
      await this.updateBusinessUseCase.execute(userId, id, dto),
    );
  }

  /** Multipart, with the image in the `file` field; over the size limit is a 413. */
  @Put(':id/logo')
  @UseGuards(ClerkGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  async setLogo(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(ImageFilePipe) file: FileUpload,
  ) {
    return presentBusiness(
      await this.setBusinessLogoUseCase.execute(userId, id, file),
    );
  }

  /** Saca el Logo; 204 también si el Negocio no tenía. */
  @Delete(':id/logo')
  @UseGuards(ClerkGuard)
  @HttpCode(204)
  async removeLogo(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.removeBusinessLogoUseCase.execute(userId, id);
  }

  @Get()
  @UseGuards(ClerkGuard)
  async list(@CurrentUser() userId: number) {
    return (await this.listBusinessesByOwnerUseCase.execute(userId)).map(
      presentBusiness,
    );
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return presentBusiness(await this.getBusinessUseCase.execute(id));
  }

  @Get('by-slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return presentBusiness(await this.getBusinessBySlugUseCase.execute(slug));
  }
}
