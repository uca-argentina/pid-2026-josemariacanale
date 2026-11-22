import { Module } from '@nestjs/common';
import { JoinWaitlistUseCase } from '../../application/waitlist/join-waitlist.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { HolidaysModule } from '../holidays/holidays.module';
import { SendFreeSlotNoticesUseCase } from '../../application/waitlist/send-free-slot-notices.use-case';
import { FreeSlotNoticesJob } from './free-slot-notices.job';
import { WaitlistController } from './waitlist.controller';
import { JoinSlotWaitlistUseCase } from '../../application/slot-waitlist/join-slot-waitlist.use-case';
import { GetSlotWaitlistEntryByLinkUseCase } from '../../application/slot-waitlist/get-slot-waitlist-entry-by-link.use-case';
import { LeaveSlotWaitlistUseCase } from '../../application/slot-waitlist/leave-slot-waitlist.use-case';
import { GetWaitlistEntryByLinkUseCase } from 'src/application/waitlist/get-waitlist-entry-by-link.use-case';
import { LeaveWaitlistUseCase } from '../../application/waitlist/leave-waitlist.use-case';

/** Anotarse en la Lista de espera, abrir su enlace y Salir (ADR 0034). */
@Module({
  imports: [HolidaysModule],
  controllers: [WaitlistController],
  providers: [
    JoinWaitlistUseCase,
    GetWaitlistEntryByLinkUseCase,
    LeaveWaitlistUseCase,
    JoinSlotWaitlistUseCase,
    GetSlotWaitlistEntryByLinkUseCase,
    GetWaitlistEntryByLinkUseCase,
    LeaveSlotWaitlistUseCase,
    ListSlotsUseCase,
    SendFreeSlotNoticesUseCase,
    FreeSlotNoticesJob,
  ],
})
export class WaitlistModule {}
