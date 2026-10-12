import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { listCabinsUseCase } from '@/src/application/use-cases/cabins/list-cabins.use-case';
import { createCabinUseCase } from '@/src/application/use-cases/cabins/create-cabin.use-case';
import { renameCabinUseCase } from '@/src/application/use-cases/cabins/rename-cabin.use-case';
import { retireCabinUseCase } from '@/src/application/use-cases/cabins/retire-cabin.use-case';
import { CabinsRepository } from '@/src/infrastructure/repositories/cabins.repository';
import { listCabinsController } from '@/src/interface-adapters/controllers/cabins/list-cabins.controller';
import { createCabinController } from '@/src/interface-adapters/controllers/cabins/create-cabin.controller';
import { renameCabinController } from '@/src/interface-adapters/controllers/cabins/rename-cabin.controller';
import { retireCabinController } from '@/src/interface-adapters/controllers/cabins/retire-cabin.controller';

export function createCabinsModule() {
    const cabinsModule = createModule();

    cabinsModule.bind(DI_SYMBOLS.ICabinsRepository).toClass(CabinsRepository, [DI_SYMBOLS.IAuthenticationService]);

    cabinsModule
        .bind(DI_SYMBOLS.IListCabinsUseCase)
        .toHigherOrderFunction(listCabinsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICabinsRepository]);
    cabinsModule
        .bind(DI_SYMBOLS.IListCabinsController)
        .toHigherOrderFunction(listCabinsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListCabinsUseCase,
        ]);

    cabinsModule
        .bind(DI_SYMBOLS.ICreateCabinUseCase)
        .toHigherOrderFunction(createCabinUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICabinsRepository]);
    cabinsModule
        .bind(DI_SYMBOLS.ICreateCabinController)
        .toHigherOrderFunction(createCabinController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICreateCabinUseCase,
        ]);

    cabinsModule
        .bind(DI_SYMBOLS.IRenameCabinUseCase)
        .toHigherOrderFunction(renameCabinUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICabinsRepository]);
    cabinsModule
        .bind(DI_SYMBOLS.IRenameCabinController)
        .toHigherOrderFunction(renameCabinController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRenameCabinUseCase,
        ]);

    cabinsModule
        .bind(DI_SYMBOLS.IRetireCabinUseCase)
        .toHigherOrderFunction(retireCabinUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICabinsRepository]);
    cabinsModule
        .bind(DI_SYMBOLS.IRetireCabinController)
        .toHigherOrderFunction(retireCabinController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRetireCabinUseCase,
        ]);

    return cabinsModule;
}
