import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { LlegadaService } from './llegada.service';

@Controller()
export class LlegadaController {
  constructor(private readonly llegada: LlegadaService) {}

  @Get('agenda')
  @UseGuards(ClerkGuard)
  agenda(@CurrentUser() userId: number, @Query('fecha') fecha: string) {
    return this.llegada.agendaDelDia(userId, fecha);
  }

  @Patch('agenda/:id/llegada')
  @UseGuards(ClerkGuard)
  registrar(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.llegada.registrar(userId, id);
  }

  @Get('booking-links/:secret/llegada')
  deEnlace(@Param('secret') secret: string) {
    return this.llegada.deEnlace(secret);
  }
}
