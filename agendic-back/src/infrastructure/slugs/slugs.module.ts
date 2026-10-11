import { Module } from '@nestjs/common';
import { ResolveSlugUseCase } from '../../application/slugs/resolve-slug.use-case';
import { GetUserPageUseCase } from '../../application/users/get-user-page.use-case';
import { SlugsController } from './slugs.controller';

@Module({
  controllers: [SlugsController],
  providers: [ResolveSlugUseCase, GetUserPageUseCase],
})
export class SlugsModule {}
