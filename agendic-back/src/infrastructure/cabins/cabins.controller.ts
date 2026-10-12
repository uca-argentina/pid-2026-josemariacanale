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
  UseGuards,
} from '@nestjs/common';
import { CreateCabinUseCase } from '../../application/cabins/create-cabin.use-case';
import { ListCabinsUseCase } from '../../application/cabins/list-cabins.use-case';
import { RenameCabinUseCase } from '../../application/cabins/rename-cabin.use-case';
import { RetireCabinUseCase } from '../../application/cabins/retire-cabin.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentCabin } from './cabin.presenter';
import { CabinNameDto } from './cabins.dto';

/** Gestión de Cabinas del Dueño (ADR 0030); everything needs a Sesión. */
@Controller()
@UseGuards(ClerkGuard)
export class CabinsController {
  constructor(
    private readonly listCabinsUseCase: ListCabinsUseCase,
    private readonly createCabinUseCase: CreateCabinUseCase,
    private readonly renameCabinUseCase: RenameCabinUseCase,
    private readonly retireCabinUseCase: RetireCabinUseCase,
  ) {}

  /** @throws {ForbiddenError} the Usuario isn't the Dueño */
  @Get('branches/:id/cabins')
  async list(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) branchId: number,
  ) {
    return (await this.listCabinsUseCase.execute(userId, branchId)).map(
      presentCabin,
    );
  }

  /** @throws {ConflictError} the name is in use in the Sucursal */
  @Post('branches/:id/cabins')
  async create(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) branchId: number,
    @Body() dto: CabinNameDto,
  ) {
    return presentCabin(
      await this.createCabinUseCase.execute(userId, branchId, dto.name),
    );
  }

  /** @throws {ConflictError} the name is in use in the Sucursal */
  @Patch('cabins/:id')
  async rename(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CabinNameDto,
  ) {
    return presentCabin(
      await this.renameCabinUseCase.execute(userId, id, dto.name),
    );
  }

  /** @throws {NotFoundError} the Cabina doesn't exist or was already dada de baja */
  @Delete('cabins/:id')
  @HttpCode(204)
  async retire(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.retireCabinUseCase.execute(userId, id);
  }
}
