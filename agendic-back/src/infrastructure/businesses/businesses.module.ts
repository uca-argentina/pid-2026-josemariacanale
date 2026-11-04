import { Module } from '@nestjs/common';
import { CreateBusinessUseCase } from '../../application/businesses/create-business.use-case';
import { GetBusinessBySlugUseCase } from '../../application/businesses/get-business-by-slug.use-case';
import { GetBusinessUseCase } from '../../application/businesses/get-business.use-case';
import { ListBusinessesByOwnerUseCase } from '../../application/businesses/list-businesses-by-owner.use-case';
import { ListMyBusinessesUseCase } from '../../application/businesses/list-my-businesses.use-case';
import { RemoveBusinessLogoUseCase } from '../../application/businesses/remove-business-logo.use-case';
import { SetBusinessLogoUseCase } from '../../application/businesses/set-business-logo.use-case';
import { UpdateBusinessUseCase } from '../../application/businesses/update-business.use-case';
import { UsersModule } from '../users/users.module';
import { BusinessesController } from './businesses.controller';
import { UserBusinessesController } from './user-businesses.controller';

@Module({
  imports: [UsersModule],
  controllers: [BusinessesController, UserBusinessesController],
  providers: [
    CreateBusinessUseCase,
    UpdateBusinessUseCase,
    SetBusinessLogoUseCase,
    RemoveBusinessLogoUseCase,
    ListBusinessesByOwnerUseCase,
    ListMyBusinessesUseCase,
    GetBusinessUseCase,
    GetBusinessBySlugUseCase,
  ],
})
export class BusinessesModule {}
