import { Module } from '@nestjs/common';
import { ResolveSlugUseCase } from '../../application/slugs/resolve-slug.use-case';
import { GetUserPageUseCase } from '../../application/users/get-user-page.use-case';
import { SlugsController } from './slugs.controller';
import { CheckSlugAvailabilityUseCase } from '../../application/slugs/check-slug-availability.use-case';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [SlugsController],
  providers: [
    ResolveSlugUseCase,
    GetUserPageUseCase,
    CheckSlugAvailabilityUseCase,
  ],
})
export class SlugsModule {}
