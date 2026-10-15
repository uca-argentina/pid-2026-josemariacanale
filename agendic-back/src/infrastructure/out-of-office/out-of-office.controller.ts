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
import { PreviewOutOfOfficeUseCase } from '../../application/out-of-office/preview-out-of-office.use-case';
import { PreviewEditOutOfOfficeUseCase } from '../../application/out-of-office/preview-edit-out-of-office.use-case';
import { UpdateOutOfOfficeUseCase } from '../../application/out-of-office/update-out-of-office.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { ConfirmedOutOfOfficeDto, OutOfOfficeDto } from './out-of-office.dto';
import { presentLeftOutside, presentOutOfOffice } from './out-of-office.presenter';

/** Períodos Fuera de la oficina del propio Usuario (ADR 0027). */
@Controller('users/me/out-of-office')
@UseGuards(ClerkGuard)
export class OutOfOfficeController {
  constructor(
    private readonly listOutOfOfficeUseCase: ListOutOfOfficeUseCase,
    private readonly createOutOfOfficeUseCase: CreateOutOfOfficeUseCase,
    private readonly previewOutOfOfficeUseCase: PreviewOutOfOfficeUseCase,
    private readonly previewEditOutOfOfficeUseCase: PreviewEditOutOfOfficeUseCase,
    private readonly updateOutOfOfficeUseCase: UpdateOutOfOfficeUseCase,
    private readonly deleteOutOfOfficeUseCase: DeleteOutOfOfficeUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() userId: number) {
    return (await this.listOutOfOfficeUseCase.execute(userId)).map(
      presentOutOfOffice,
    );
  }

  /** Los Turnos que un período nuevo dejaría afuera; no guarda nada. */
  @Post('preview')
  @HttpCode(200)
  async preview(@CurrentUser() userId: number, @Body() dto: OutOfOfficeDto) {
    return (
      await this.previewOutOfOfficeUseCase.execute(userId, toFields(dto))
    ).map(presentLeftOutside);
  }

  @Post()
  async create(
    @CurrentUser() userId: number,
    @Body() dto: ConfirmedOutOfOfficeDto,
  ) {
    const { outOfOffice, cancelledBookings } =
      await this.createOutOfOfficeUseCase.execute(
        userId,
        toFields(dto),
        dto.cancelBookingIds,
      );
    return { ...presentOutOfOffice(outOfOffice), cancelledBookings };
  }

  /** Los Turnos que editar el período dejaría afuera; no guarda nada. */
  @Post(':id/preview')
  @HttpCode(200)
  async previewEdit(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OutOfOfficeDto,
  ) {
    return (
      await this.previewEditOutOfOfficeUseCase.execute(
        userId,
        id,
        toFields(dto),
      )
    ).map(presentLeftOutside);
  }

  /** Reemplaza el período y cancela los Turnos que la edición deja afuera, los que el Usuario confirmó. */
  @Put(':id')
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmedOutOfOfficeDto,
  ) {
    const { outOfOffice, cancelledBookings } =
      await this.updateOutOfOfficeUseCase.execute(
        userId,
        id,
        toFields(dto),
        dto.cancelBookingIds,
      );
    return { ...presentOutOfOffice(outOfOffice), cancelledBookings };
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
