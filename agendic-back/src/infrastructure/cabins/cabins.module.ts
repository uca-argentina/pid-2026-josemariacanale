import { Module } from '@nestjs/common';
import { CreateCabinUseCase } from '../../application/cabins/create-cabin.use-case';
import { ListCabinsUseCase } from '../../application/cabins/list-cabins.use-case';
import { RenameCabinUseCase } from '../../application/cabins/rename-cabin.use-case';
import { RetireCabinUseCase } from '../../application/cabins/retire-cabin.use-case';
import { UsersModule } from '../users/users.module';
import { CabinsController } from './cabins.controller';

@Module({
  imports: [UsersModule],
  controllers: [CabinsController],
  providers: [
    ListCabinsUseCase,
    CreateCabinUseCase,
    RenameCabinUseCase,
    RetireCabinUseCase,
  ],
})
export class CabinsModule {}
