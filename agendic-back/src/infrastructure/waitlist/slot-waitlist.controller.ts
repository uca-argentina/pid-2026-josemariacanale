import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AcceptSlotOfferUseCase } from '../../application/slot-waitlist/accept-slot-offer.use-case';
import { GetSlotWaitlistEntryByLinkUseCase } from '../../application/slot-waitlist/get-slot-waitlist-entry-by-link.use-case';
import { JoinSlotWaitlistUseCase } from '../../application/slot-waitlist/join-slot-waitlist.use-case';
import { LeaveSlotWaitlistUseCase } from '../../application/slot-waitlist/leave-slot-waitlist.use-case';
import { JoinSlotWaitlistDto } from './slot-waitlist.dto';

@Controller()
export class SlotWaitlistController {
  constructor(
    private readonly joinUseCase: JoinSlotWaitlistUseCase,
    private readonly getUseCase: GetSlotWaitlistEntryByLinkUseCase,
    private readonly leaveUseCase: LeaveSlotWaitlistUseCase,
    private readonly acceptUseCase: AcceptSlotOfferUseCase,
  ) {}

  @Post('services/:id/slot-waitlist')
  async join(
    @Param('id', ParseIntPipe) serviceId: number,
    @Body() dto: JoinSlotWaitlistDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { created, ...entry } = await this.joinUseCase.execute({
      serviceId,
      startsAt: dto.startsAt,
      employeeId: dto.employeeId,
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      code: dto.code,
    });
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return entry;
  }

  @Get('slot-waitlist-links/:secret')
  get(@Param('secret') secret: string) {
    return this.getUseCase.execute(secret);
  }

  // A POST from a button, never a GET: mail antivirus scanners open the links they find.
  @Post('slot-waitlist-links/:secret/accept')
  @HttpCode(HttpStatus.OK)
  accept(@Param('secret') secret: string) {
    return this.acceptUseCase.execute(secret);
  }

  @Post('slot-waitlist-links/:secret/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@Param('secret') secret: string) {
    return this.leaveUseCase.execute(secret);
  }
}
