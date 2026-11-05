import { Module } from '@nestjs/common';
import { CreateStreakRewardUseCase } from '../../application/streaks/create-streak-reward.use-case';
import { DeleteStreakRewardUseCase } from '../../application/streaks/delete-streak-reward.use-case';
import { GetBookingStreakUseCase } from '../../application/streaks/get-booking-streak.use-case';
import { RedeemStreakPrizeUseCase } from '../../application/streaks/redeem-streak-prize.use-case';
import { GrantStreakPrizesUseCase } from '../../application/streaks/grant-streak-prizes.use-case';
import { GetStreakProgramUseCase } from '../../application/streaks/get-streak-program.use-case';
import { SaveStreakProgramUseCase } from '../../application/streaks/save-streak-program.use-case';
import { UpdateStreakRewardUseCase } from '../../application/streaks/update-streak-reward.use-case';
import { UsersModule } from '../users/users.module';
import { StreakPrizesJob } from './streak-prizes.job';
import { StreaksController } from './streaks.controller';

/** Wires the configuration of the Rachas and their Recompensas, and the job that grants the Premios. */
@Module({
  imports: [UsersModule],
  controllers: [StreaksController],
  providers: [
    GetStreakProgramUseCase,
    SaveStreakProgramUseCase,
    CreateStreakRewardUseCase,
    UpdateStreakRewardUseCase,
    DeleteStreakRewardUseCase,
    GrantStreakPrizesUseCase,
    GetBookingStreakUseCase,
    RedeemStreakPrizeUseCase,
    StreakPrizesJob,
  ],
})
export class StreaksModule {}
