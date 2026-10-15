import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JoinWaitlistUseCase } from '../../application/waitlist/join-waitlist.use-case';
import { JoinWaitlistDto } from './waitlist.dto';

/** Lista de espera de un Servicio. */
@Controller()
export class WaitlistController {
  constructor(private readonly joinWaitlistUseCase: JoinWaitlistUseCase) {}

  /**
   * Anota al Cliente en la Lista de espera del Servicio para un día lleno: 201 si la Anotación es nueva, 200 si ya
   * había una viva.
   *
   * @throws {InvalidCodeError} el código no es válido para clientEmail
   * @throws {NotFoundError} el Servicio no existe o está dado de baja
   * @throws {BusinessRuleError} la fecha es anterior a hoy en la zona del Servicio
   * @throws {ConflictError} ese día el Servicio no está lleno
   */
  @Post('services/:id/waitlist')
  async join(
    @Param('id', ParseIntPipe) serviceId: number,
    @Body() dto: JoinWaitlistDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { created, ...entry } = await this.joinWaitlistUseCase.execute({
      serviceId,
      date: dto.date,
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      code: dto.code,
    });
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return entry;
  }
}
