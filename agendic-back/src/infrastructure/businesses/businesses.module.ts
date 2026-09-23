import { Module } from '@nestjs/common';
import { CreateBusinessUseCase } from '../../application/businesses/create-business.use-case';
import { GetBusinessUseCase } from '../../application/businesses/get-business.use-case';
import { ListBusinessesByOwnerUseCase } from '../../application/businesses/list-businesses-by-owner.use-case';
import { UpdateBusinessUseCase } from '../../application/businesses/update-business.use-case';
import { UsersModule } from '../users/users.module';
import { BusinessesController } from './businesses.controller';

@Module({
  imports: [UsersModule],
  controllers: [BusinessesController],
  providers: [
    CreateBusinessUseCase,
    UpdateBusinessUseCase,
    ListBusinessesByOwnerUseCase,
    GetBusinessUseCase,
  ],
})
export class BusinessesModule {}
