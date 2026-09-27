import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { PayDepositUseCase } from '../../application/bookings/pay-deposit.use-case';
import { UpdateBookingStatusUseCase } from '../../application/bookings/update-booking-status.use-case';
import { VerifyBookingUseCase } from '../../application/bookings/verify-booking.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentBooking, presentBookingForOwner } from './booking.presenter';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  VerifyBookingDto,
} from './bookings.dto';

@Controller()
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly verifyBookingUseCase: VerifyBookingUseCase,
    private readonly listBookingsByBusinessUseCase: ListBookingsByBusinessUseCase,
    private readonly payDepositUseCase: PayDepositUseCase,
    private readonly updateBookingStatusUseCase: UpdateBookingStatusUseCase,
  ) {}

  @Post('bookings')
  async create(@Body() dto: CreateBookingDto) {
    return presentBooking(
      await this.createBookingUseCase.execute({
        serviceId: dto.serviceId,
        employeeId: dto.employeeId,
        startsAt: new Date(dto.startsAt),
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
      }),
    );
  }

  @Post('bookings/verification')
  async verify(@Body() dto: VerifyBookingDto) {
    return presentBooking(await this.verifyBookingUseCase.execute(dto.token));
  }

  @Post('bookings/:id/pay-deposit')
  async payDeposit(@Param('id', ParseIntPipe) id: number) {
    return presentBooking(await this.payDepositUseCase.execute(id));
  }

  @Patch('bookings/:id/status')
  @UseGuards(ClerkGuard)
  async updateStatus(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return presentBookingForOwner(
      await this.updateBookingStatusUseCase.execute(userId, id, dto.status),
    );
  }

  @Get('businesses/:id/bookings')
  @UseGuards(ClerkGuard)
  async listByBusiness(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return (
      await this.listBookingsByBusinessUseCase.execute(userId, businessId)
    ).map(presentBookingForOwner);
  }
}
