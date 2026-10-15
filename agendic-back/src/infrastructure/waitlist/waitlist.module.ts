import { Module } from '@nestjs/common';
import { JoinWaitlistUseCase } from '../../application/waitlist/join-waitlist.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { HolidaysModule } from '../holidays/holidays.module';
import { WaitlistController } from './waitlist.controller';

/** Anotarse en la Lista de espera (ADR 0034). */
@Module({
  imports: [HolidaysModule],
  controllers: [WaitlistController],
  providers: [JoinWaitlistUseCase, ListSlotsUseCase],
})
export class WaitlistModule {}
