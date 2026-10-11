import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { listOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/list-out-of-office.use-case';
import { OutOfOfficeRepository } from '@/src/infrastructure/repositories/out-of-office.repository';
import { listMyOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/list-my-out-of-office.controller';

export function createOutOfOfficeModule() {
    const outOfOfficeModule = createModule();

    outOfOfficeModule.bind(DI_SYMBOLS.IOutOfOfficeRepository).toClass(OutOfOfficeRepository, [
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IInstrumentationService,
    ]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IListOutOfOfficeUseCase)
        .toHigherOrderFunction(listOutOfOfficeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOutOfOfficeRepository]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IListMyOutOfOfficeController)
        .toHigherOrderFunction(listMyOutOfOfficeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListOutOfOfficeUseCase,
        ]);

    return outOfOfficeModule;
}
