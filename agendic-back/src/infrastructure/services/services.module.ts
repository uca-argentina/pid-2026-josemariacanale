import { Module } from '@nestjs/common';
import { AssignEmployeeUseCase } from '../../application/services/assign-employee.use-case';
import { ChangeEmployeeAvailabilityUseCase } from '../../application/services/change-employee-availability.use-case';
import { CreatePersonalServiceUseCase } from '../../application/services/create-personal-service.use-case';
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { GetServiceBySlugUseCase } from '../../application/services/get-service-by-slug.use-case';
import { GetPersonalServiceBySlugUseCase } from '../../application/services/get-personal-service-by-slug.use-case';
import { ListActiveServicesByBranchUseCase } from '../../application/services/list-active-services-by-branch.use-case';
import { ListPersonalServicesUseCase } from '../../application/services/list-personal-services.use-case';
import { ListMyServicesUseCase } from '../../application/services/list-my-services.use-case';
import { RemoveEmployeeUseCase } from '../../application/services/remove-employee.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
import { GetUserPageUseCase } from '../../application/users/get-user-page.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { UsersModule } from '../users/users.module';
import { ServicesController } from './services.controller';

@Module({
  imports: [UsersModule],
  controllers: [ServicesController],
  providers: [
    CreateServiceUseCase,
    UpdateServiceUseCase,
    RetireServiceUseCase,
    ListActiveServicesByBranchUseCase,
    GetServiceBySlugUseCase,
    AssignEmployeeUseCase,
    ChangeEmployeeAvailabilityUseCase,
    RemoveEmployeeUseCase,
    ListSlotsUseCase,
    ListMyServicesUseCase,
    CreatePersonalServiceUseCase,
    ListPersonalServicesUseCase,
    GetUserPageUseCase,
    GetPersonalServiceBySlugUseCase,
  ],
})
export class ServicesModule {}
