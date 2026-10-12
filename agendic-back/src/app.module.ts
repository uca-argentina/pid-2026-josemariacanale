import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

@Module({
  imports: [ScheduleModule.forRoot(), InfrastructureModule],
})
export class AppModule {}
