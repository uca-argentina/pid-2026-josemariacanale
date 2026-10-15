import { Module } from '@nestjs/common';
import { CreateOutOfOfficeUseCase } from '../../application/out-of-office/create-out-of-office.use-case';
import { DeleteOutOfOfficeUseCase } from '../../application/out-of-office/delete-out-of-office.use-case';
import { ListOutOfOfficeUseCase } from '../../application/out-of-office/list-out-of-office.use-case';
import { PreviewOutOfOfficeUseCase } from '../../application/out-of-office/preview-out-of-office.use-case';
import { PreviewEditOutOfOfficeUseCase } from '../../application/out-of-office/preview-edit-out-of-office.use-case';
import { UpdateOutOfOfficeUseCase } from '../../application/out-of-office/update-out-of-office.use-case';
import { LeftOutsideBookingsService } from '../../application/bookings/left-outside-bookings.service';
import { HolidaysModule } from '../holidays/holidays.module';
import { UsersModule } from '../users/users.module';
import { OutOfOfficeController } from './out-of-office.controller';

@Module({
  imports: [UsersModule, HolidaysModule],
  controllers: [OutOfOfficeController],
  providers: [
    ListOutOfOfficeUseCase,
    CreateOutOfOfficeUseCase,
    PreviewOutOfOfficeUseCase,
    PreviewEditOutOfOfficeUseCase,
    LeftOutsideBookingsService,
    UpdateOutOfOfficeUseCase,
    DeleteOutOfOfficeUseCase,
  ],
})
export class OutOfOfficeModule {}
