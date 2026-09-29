import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { SlotsRepository } from '@/src/infrastructure/repositories/slots.repository';
import { getSlotsUseCase } from '@/src/application/use-cases/slots/get-slots.use-case';
import { getSlotsController } from '@/src/interface-adapters/controllers/slots/get-slots.controller';

export function createSlotsModule() {
    const slotsModule = createModule();

    slotsModule.bind(DI_SYMBOLS.ISlotsRepository).toClass(SlotsRepository);

    slotsModule
        .bind(DI_SYMBOLS.IGetSlotsUseCase)
        .toHigherOrderFunction(getSlotsUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.ISlotsRepository,
        ]);

    slotsModule
        .bind(DI_SYMBOLS.IGetSlotsController)
        .toHigherOrderFunction(getSlotsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IGetSlotsUseCase,
        ]);

    return slotsModule;
}
