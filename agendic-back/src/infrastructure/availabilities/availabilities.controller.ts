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
  UseGuards,
} from '@nestjs/common';
import { CreateAvailabilityUseCase } from '../../application/availabilities/create-availability.use-case';
import { DeleteAvailabilityUseCase } from '../../application/availabilities/delete-availability.use-case';
import { GetAvailabilityUseCase } from '../../application/availabilities/get-availability.use-case';
import { ListAvailabilitiesUseCase } from '../../application/availabilities/list-availabilities.use-case';
import { MakeDefaultAvailabilityUseCase } from '../../application/availabilities/make-default-availability.use-case';
import { UpdateAvailabilityUseCase } from '../../application/availabilities/update-availability.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from './availabilities.dto';
import {
  presentAvailability,
  presentAvailabilitySummary,
} from './availability.presenter';

/** Horas laborables del propio Usuario (ADR 0020). */
@Controller('availabilities')
@UseGuards(ClerkGuard)
export class AvailabilitiesController {
  constructor(
    private readonly listAvailabilitiesUseCase: ListAvailabilitiesUseCase,
    private readonly getAvailabilityUseCase: GetAvailabilityUseCase,
    private readonly createAvailabilityUseCase: CreateAvailabilityUseCase,
    private readonly updateAvailabilityUseCase: UpdateAvailabilityUseCase,
    private readonly makeDefaultAvailabilityUseCase: MakeDefaultAvailabilityUseCase,
    private readonly deleteAvailabilityUseCase: DeleteAvailabilityUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() userId: number) {
    return (await this.listAvailabilitiesUseCase.execute(userId)).map(
      presentAvailabilitySummary,
    );
  }

  @Post()
  async create(
    @CurrentUser() userId: number,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return presentAvailability(
      await this.createAvailabilityUseCase.execute(userId, dto),
    );
  }

  @Get(':id')
  async get(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentAvailability(
      await this.getAvailabilityUseCase.execute(userId, id),
    );
  }

  @Put(':id')
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() { name, timeZone, schedule, overrides }: UpdateAvailabilityDto,
  ) {
    return presentAvailability(
      await this.updateAvailabilityUseCase.execute(userId, id, {
        name,
        timeZone,
        schedule,
        overrides,
      }),
    );
  }

  @Patch(':id/default')
  async makeDefault(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return presentAvailability(
      await this.makeDefaultAvailabilityUseCase.execute(userId, id),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.deleteAvailabilityUseCase.execute(userId, id);
  }
}
