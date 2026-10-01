import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { listOverridesUseCase } from '@/src/application/use-cases/overrides/list-overrides.use-case';
import { setOverrideUseCase } from '@/src/application/use-cases/overrides/set-override.use-case';
import { removeOverrideUseCase } from '@/src/application/use-cases/overrides/remove-override.use-case';
import { OverridesRepository } from '@/src/infrastructure/repositories/overrides.repository';
import { setOverridesController } from '@/src/interface-adapters/controllers/overrides/set-overrides.controller';
import { removeOverrideController } from '@/src/interface-adapters/controllers/overrides/remove-override.controller';

export function createOverridesModule() {
    const overridesModule = createModule();

    overridesModule.bind(DI_SYMBOLS.IOverridesRepository).toClass(OverridesRepository, [DI_SYMBOLS.IAuthenticationService]);

    overridesModule
        .bind(DI_SYMBOLS.IListOverridesUseCase)
        .toHigherOrderFunction(listOverridesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOverridesRepository]);

    overridesModule
        .bind(DI_SYMBOLS.ISetOverrideUseCase)
        .toHigherOrderFunction(setOverrideUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOverridesRepository]);

    overridesModule
        .bind(DI_SYMBOLS.IRemoveOverrideUseCase)
        .toHigherOrderFunction(removeOverrideUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOverridesRepository]);

    overridesModule
        .bind(DI_SYMBOLS.ISetOverridesController)
        .toHigherOrderFunction(setOverridesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ISetOverrideUseCase,
        ]);

    overridesModule
        .bind(DI_SYMBOLS.IRemoveOverrideController)
        .toHigherOrderFunction(removeOverrideController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRemoveOverrideUseCase,
        ]);

    return overridesModule;
}
