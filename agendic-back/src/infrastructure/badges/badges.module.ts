import { Module } from '@nestjs/common';
import { EvaluateBadgesUseCase } from '../../application/badges/evaluate-badges.use-case';
import { GetMyBadgesUseCase } from '../../application/badges/get-my-badges.use-case';
import { ListUnseenBadgesUseCase } from '../../application/badges/list-unseen-badges.use-case';
import { MarkBadgesSeenUseCase } from '../../application/badges/mark-badges-seen.use-case';
import { UsersModule } from '../users/users.module';
import { BadgesController } from './badges.controller';

@Module({
  imports: [UsersModule],
  controllers: [BadgesController],
  providers: [
    EvaluateBadgesUseCase,
    GetMyBadgesUseCase,
    ListUnseenBadgesUseCase,
    MarkBadgesSeenUseCase,
  ],
  exports: [EvaluateBadgesUseCase],
})
export class BadgesModule {}
