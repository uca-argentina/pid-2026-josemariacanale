import { Module } from '@nestjs/common';
import { GetWaitlistEntryByLinkUseCase } from '../../application/waitlist/get-waitlist-entry-by-link.use-case';
import { LeaveWaitlistUseCase } from '../../application/waitlist/leave-waitlist.use-case';
import { JoinWaitlistUseCase } from '../../application/waitlist/join-waitlist.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { HolidaysModule } from '../holidays/holidays.module';
import { SendFreeSlotNoticesUseCase } from '../../application/waitlist/send-free-slot-notices.use-case';
import { FreeSlotNoticesJob } from './free-slot-notices.job';
import { WaitlistController } from './waitlist.controller';

/** Anotarse en la Lista de espera, abrir su enlace y Salir (ADR 0034). */
@Module({
  imports: [HolidaysModule],
  controllers: [WaitlistController],
  providers: [
    JoinWaitlistUseCase,
    GetWaitlistEntryByLinkUseCase,
    LeaveWaitlistUseCase,
    ListSlotsUseCase,
    SendFreeSlotNoticesUseCase,
    FreeSlotNoticesJob,
  ],
})
export class WaitlistModule {}
