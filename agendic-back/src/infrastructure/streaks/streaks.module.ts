import { Module } from '@nestjs/common';
import { CreateStreakRewardUseCase } from '../../application/streaks/create-streak-reward.use-case';
import { DeleteStreakRewardUseCase } from '../../application/streaks/delete-streak-reward.use-case';
import { GetStreakProgramUseCase } from '../../application/streaks/get-streak-program.use-case';
import { SaveStreakProgramUseCase } from '../../application/streaks/save-streak-program.use-case';
import { UpdateStreakRewardUseCase } from '../../application/streaks/update-streak-reward.use-case';
import { UsersModule } from '../users/users.module';
import { StreaksController } from './streaks.controller';

/** Wires the configuration of the Rachas and their Recompensas. */
@Module({
  imports: [UsersModule],
  controllers: [StreaksController],
  providers: [
    GetStreakProgramUseCase,
    SaveStreakProgramUseCase,
    CreateStreakRewardUseCase,
    UpdateStreakRewardUseCase,
    DeleteStreakRewardUseCase,
  ],
})
export class StreaksModule {}
