import { Module } from '@nestjs/common';
import { DeleteOverridesUseCase } from '../../application/availability-overrides/delete-overrides.use-case';
import { ListOverridesByEmployeeUseCase } from '../../application/availability-overrides/list-overrides-by-employee.use-case';
import { ReplaceOverridesUseCase } from '../../application/availability-overrides/replace-overrides.use-case';
import { UsersModule } from '../users/users.module';
import { AvailabilityOverridesController } from './availability-overrides.controller';

@Module({
  imports: [UsersModule],
  controllers: [AvailabilityOverridesController],
  providers: [
    ListOverridesByEmployeeUseCase,
    ReplaceOverridesUseCase,
    DeleteOverridesUseCase,
  ],
})
export class AvailabilityOverridesModule {}
