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
  UseGuards,
} from '@nestjs/common';
import { CreateOutOfOfficeUseCase } from '../../application/out-of-office/create-out-of-office.use-case';
import { DeleteOutOfOfficeUseCase } from '../../application/out-of-office/delete-out-of-office.use-case';
import { ListOutOfOfficeUseCase } from '../../application/out-of-office/list-out-of-office.use-case';
import { UpdateOutOfOfficeUseCase } from '../../application/out-of-office/update-out-of-office.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { OutOfOfficeDto } from './out-of-office.dto';
import { presentOutOfOffice } from './out-of-office.presenter';

/** Períodos Fuera de la oficina del propio Usuario (ADR 0027). */
@Controller('users/me/out-of-office')
@UseGuards(ClerkGuard)
export class OutOfOfficeController {
  constructor(
    private readonly listOutOfOfficeUseCase: ListOutOfOfficeUseCase,
    private readonly createOutOfOfficeUseCase: CreateOutOfOfficeUseCase,
    private readonly updateOutOfOfficeUseCase: UpdateOutOfOfficeUseCase,
    private readonly deleteOutOfOfficeUseCase: DeleteOutOfOfficeUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() userId: number) {
    return (await this.listOutOfOfficeUseCase.execute(userId)).map(
      presentOutOfOffice,
    );
  }

  @Post()
  async create(@CurrentUser() userId: number, @Body() dto: OutOfOfficeDto) {
    return presentOutOfOffice(
      await this.createOutOfOfficeUseCase.execute(userId, toFields(dto)),
    );
  }

  @Put(':id')
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OutOfOfficeDto,
  ) {
    return presentOutOfOffice(
      await this.updateOutOfOfficeUseCase.execute(userId, id, toFields(dto)),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.deleteOutOfOfficeUseCase.execute(userId, id);
  }
}

const toFields = ({
  startDate,
  endDate,
  reason,
  notes,
  showNotePublicly,
}: OutOfOfficeDto) => ({
  startDate,
  endDate,
  reason,
  notes: notes ?? null,
  showNotePublicly: showNotePublicly ?? false,
});
