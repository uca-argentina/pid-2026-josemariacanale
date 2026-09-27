import { Module } from '@nestjs/common';
import { CreateAvailabilityUseCase } from '../../application/availabilities/create-availability.use-case';
import { DeleteAvailabilityUseCase } from '../../application/availabilities/delete-availability.use-case';
import { ListAvailabilitiesByEmployeeUseCase } from '../../application/availabilities/list-availabilities-by-employee.use-case';
import { MakeDefaultAvailabilityUseCase } from '../../application/availabilities/make-default-availability.use-case';
import { UpdateAvailabilityUseCase } from '../../application/availabilities/update-availability.use-case';
import { UsersModule } from '../users/users.module';
import { AvailabilitiesController } from './availabilities.controller';

@Module({
  imports: [UsersModule],
  controllers: [AvailabilitiesController],
  providers: [
    ListAvailabilitiesByEmployeeUseCase,
    CreateAvailabilityUseCase,
    UpdateAvailabilityUseCase,
    MakeDefaultAvailabilityUseCase,
    DeleteAvailabilityUseCase,
  ],
})
export class AvailabilitiesModule {}
