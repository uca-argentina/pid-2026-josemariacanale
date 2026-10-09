import { Module } from '@nestjs/common';
import { GetMeUseCase } from '../../application/users/get-me.use-case';
import { ResolveCurrentUserUseCase } from '../../application/users/resolve-current-user.use-case';
import { RetireMeUseCase } from '../../application/users/retire-me.use-case';
import { UpdateMeUseCase } from '../../application/users/update-me.use-case';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    GetMeUseCase,
    UpdateMeUseCase,
    RetireMeUseCase,
    ResolveCurrentUserUseCase,
  ],
  exports: [ResolveCurrentUserUseCase],
})
export class UsersModule {}
