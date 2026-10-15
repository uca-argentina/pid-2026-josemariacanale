import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { listOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/list-out-of-office.use-case';
import { OutOfOfficeRepository } from '@/src/infrastructure/repositories/out-of-office.repository';
import { listMyOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/list-my-out-of-office.controller';
import { createOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/create-out-of-office.use-case';
import { updateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/update-out-of-office.use-case';
import { deleteOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/delete-out-of-office.use-case';
import { previewOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/preview-out-of-office.use-case';
import { previewOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/preview-out-of-office.controller';
import { createOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/create-out-of-office.controller';
import { updateOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/update-out-of-office.controller';
import { deleteOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/delete-out-of-office.controller';

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

    outOfOfficeModule
        .bind(DI_SYMBOLS.ICreateOutOfOfficeUseCase)
        .toHigherOrderFunction(createOutOfOfficeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOutOfOfficeRepository]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.ICreateOutOfOfficeController)
        .toHigherOrderFunction(createOutOfOfficeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICreateOutOfOfficeUseCase,
        ]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IUpdateOutOfOfficeUseCase)
        .toHigherOrderFunction(updateOutOfOfficeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOutOfOfficeRepository]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IUpdateOutOfOfficeController)
        .toHigherOrderFunction(updateOutOfOfficeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateOutOfOfficeUseCase,
        ]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IDeleteOutOfOfficeUseCase)
        .toHigherOrderFunction(deleteOutOfOfficeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOutOfOfficeRepository]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IDeleteOutOfOfficeController)
        .toHigherOrderFunction(deleteOutOfOfficeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IDeleteOutOfOfficeUseCase,
        ]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IPreviewOutOfOfficeUseCase)
        .toHigherOrderFunction(previewOutOfOfficeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOutOfOfficeRepository]);

    outOfOfficeModule
        .bind(DI_SYMBOLS.IPreviewOutOfOfficeController)
        .toHigherOrderFunction(previewOutOfOfficeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IPreviewOutOfOfficeUseCase,
        ]);

    return outOfOfficeModule;
}
