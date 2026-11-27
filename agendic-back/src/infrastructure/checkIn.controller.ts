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
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class CheckInController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Post('checkIn/:link/llegada')
  async create(
    @Param('link') link: string,
    @Body() body: {status: String},
  ) {
    const tiempoDeTolerancia = 10
    const booking = await this.prisma.booking.findUnique({where:{ link: link}})
    if (booking){
        const serviceTime = booking.startsAt
        const arrivalTime = new Date()
        let checkIn
        if ( Number(arrivalTime) - Number(serviceTime) > tiempoDeTolerancia*60000  ){
            checkIn = await this.prisma.checkIn.create({data: {userId: booking?.userId, bookingId: booking?.id, arrivalTime: arrivalTime, status: "DELAYED"}})
        }
        else{
            checkIn = await this.prisma.checkIn.create({data: {userId: booking?.userId, bookingId: booking?.id, arrivalTime: arrivalTime, status: "ONTIME"}})
        }
        
        return checkIn
    }
  }

  /*
  @Get('branches/:id/cabins')
  async list(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) branchId: number,
  ) {
    return (await this.listCabinsUseCase.execute(userId, branchId)).map(
      presentCabin,
    );
  }

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

 
  @Delete('cabins/:id')
  @HttpCode(204)
  async retire(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.retireCabinUseCase.execute(userId, id);
  }
    */
}
