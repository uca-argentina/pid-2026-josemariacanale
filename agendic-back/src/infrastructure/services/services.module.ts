import { Module } from '@nestjs/common';
import { AssignEmployeeUseCase } from '../../application/services/assign-employee.use-case';
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { ListActiveServicesByBranchUseCase } from '../../application/services/list-active-services-by-branch.use-case';
import { ListMyServicesUseCase } from '../../application/services/list-my-services.use-case';
import { RemoveEmployeeUseCase } from '../../application/services/remove-employee.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
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
    AssignEmployeeUseCase,
    RemoveEmployeeUseCase,
    ListSlotsUseCase,
    ListMyServicesUseCase,
  ],
})
export class ServicesModule {}
