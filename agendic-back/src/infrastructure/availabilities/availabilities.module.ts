import { Module } from '@nestjs/common';
import { CreateAvailabilityUseCase } from '../../application/availabilities/create-availability.use-case';
import { DeleteAvailabilityUseCase } from '../../application/availabilities/delete-availability.use-case';
import { GetAvailabilityUseCase } from '../../application/availabilities/get-availability.use-case';
import { ListAvailabilitiesUseCase } from '../../application/availabilities/list-availabilities.use-case';
import { MakeDefaultAvailabilityUseCase } from '../../application/availabilities/make-default-availability.use-case';
import { UpdateAvailabilityUseCase } from '../../application/availabilities/update-availability.use-case';
import { UsersModule } from '../users/users.module';
import { AvailabilitiesController } from './availabilities.controller';

@Module({
  imports: [UsersModule],
  controllers: [AvailabilitiesController],
  providers: [
    ListAvailabilitiesUseCase,
    GetAvailabilityUseCase,
    CreateAvailabilityUseCase,
    UpdateAvailabilityUseCase,
    MakeDefaultAvailabilityUseCase,
    DeleteAvailabilityUseCase,
  ],
})
export class AvailabilitiesModule {}
