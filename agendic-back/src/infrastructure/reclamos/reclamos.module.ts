import { Module } from '@nestjs/common';
import { ReclamosService } from './reclamos.service';
import { UsersModule } from '../users/users.module';
import { ReclamosController } from './reclamos.controller';

@Module({
  imports: [UsersModule],
  controllers: [ReclamosController],
  providers: [ReclamosService],
})
export class ReclamosModule {}
