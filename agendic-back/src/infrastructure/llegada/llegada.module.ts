import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { LlegadaController } from './llegada.controller';
import { LlegadaService } from './llegada.service';

@Module({
  imports: [UsersModule],
  controllers: [LlegadaController],
  providers: [LlegadaService],
  exports: [LlegadaService],
})
export class LlegadaModule {}
