import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Get
} from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Controller()
export class CheckInController {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  @Post('bookings/checkin')
  async checkIn(
    @Body() body: {bookingId: number},
  ) {
    
    if (!body.bookingId)
    {
        throw new BadRequestException('Todos los campos son requeridos');
    }

    const booking = this.findBookingById(body.bookingId);

    if (!booking)
    {
        throw new NotFoundException('El turno no existe');
    }

    if ((await booking).status !== 'BOOKED')
    {
        throw new ConflictException('el turno no esta confirmado');
    }

    const horaActual = new Date();
    const horarioTurno = (await booking).startsAt;
    const horarioTurnoFin = (await booking).endsAt;
    const horaMinima = new Date(horarioTurno.getTime() - 30 * 60_000);
    const horaMaxima = new Date(horarioTurno.getTime() + 10 * 60_000);

    // si quiere hacerlo antes de 30 minutos anteriores al turno, no puede
    if (horaActual < horaMinima)
    {
        throw new ConflictException('Solo se puede hacer el Check-In 30 minutos antes del turno');
    }

    if (horaActual >= horarioTurnoFin)
    {
        throw new ConflictException('No se puede realizar el Check-In en un turno que ya paso');
    }

    // si llego 10 minutos tarde, se guarda como que llego tarde
    if (horaActual > horaMaxima)
    {
         await this.prisma.checkIn.create({
        data: { 
            bookingId: body.bookingId,
            arrivedAt: horaActual,
            status: "LLEGO TARDE"
    }})
    }
    else
    {
        await this.prisma.checkIn.create({
        data: { 
            bookingId: body.bookingId,
            arrivedAt: horaActual,
            status: "LLEGO"
    }})
    }
    
    return {message: 'Check-in realizado con éxito'};    

  }

  private async findBookingById(bookingId: number) {
    const booking = await this.prisma.booking.findFirst({
        where: {id: bookingId}
    })

    if (!booking)
    {
        throw new NotFoundException('No se ha encontrado la reserva');
    }

    return booking;

  }

  private async findCheckIn(bookingId: number) {
    const checkin = await this.prisma.checkIn.findFirst({
        where: {bookingId: bookingId}
    })

    if (!checkin)
    {
        throw new NotFoundException('No se ha encontrado el checkIn');
    }

    return checkin;
  }

  // obtengo el checkin guardado
 
  @Get('bookings/checkin/:id')
  async getByBookingId(@Param('id', ParseIntPipe) bookingId: number) {
    const checkin = await this.findCheckIn(bookingId);
    return checkin;
  }

  // en caso de que quiera cerrar el checkin una vez que se va el cliente
  @Post('bookings/close-checkin')
  async closeCheckIn(
    @Body() body: {checkInId: number},
    
  ) {
    
    if (!body.checkInId)
    {
        throw new BadRequestException('El Check-In Id es necesario');
    }

    await this.prisma.checkIn.update({
        data: {status: "CERRADO"},
        where: {id: body.checkInId}
    })

    return {message: 'Check-in cerrado con éxito'};    
  }
}

