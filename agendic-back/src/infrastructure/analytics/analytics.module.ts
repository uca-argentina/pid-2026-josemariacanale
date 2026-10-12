import { Module } from '@nestjs/common';
import { GetPersonalAnalyticsUseCase } from '../../application/analytics/get-personal-analytics.use-case';
import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [UsersModule],
  controllers: [AnalyticsController],
  providers: [GetPersonalAnalyticsUseCase],
})
export class AnalyticsModule {}
