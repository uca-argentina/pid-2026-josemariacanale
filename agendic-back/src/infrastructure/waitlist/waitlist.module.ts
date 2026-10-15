import { Module } from '@nestjs/common';
import { JoinWaitlistUseCase } from '../../application/waitlist/join-waitlist.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { HolidaysModule } from '../holidays/holidays.module';
import { WaitlistController } from './waitlist.controller';

@Module({
  imports: [HolidaysModule],
  controllers: [WaitlistController],
  providers: [JoinWaitlistUseCase, ListSlotsUseCase],
})
export class WaitlistModule {}
