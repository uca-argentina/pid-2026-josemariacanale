import { Module } from '@nestjs/common';
import { GetBusinessAnalyticsUseCase } from '../../application/analytics/get-business-analytics.use-case';
import { GetPersonalAnalyticsUseCase } from '../../application/analytics/get-personal-analytics.use-case';
import { ListAnalyticsBusinessesUseCase } from '../../application/analytics/list-analytics-businesses.use-case';
import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [UsersModule],
  controllers: [AnalyticsController],
  providers: [
    GetPersonalAnalyticsUseCase,
    GetBusinessAnalyticsUseCase,
    ListAnalyticsBusinessesUseCase,
  ],
})
export class AnalyticsModule {}
