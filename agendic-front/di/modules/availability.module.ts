import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { AvailabilityService } from '@/src/infrastructure/services/availability.service';
import { listAvailabilitiesUseCase } from '@/src/application/use-cases/availability/list-availabilities.use-case';
import { createAvailabilityUseCase } from '@/src/application/use-cases/availability/create-availability.use-case';
import { updateAvailabilityUseCase } from '@/src/application/use-cases/availability/update-availability.use-case';
import { setDefaultAvailabilityUseCase } from '@/src/application/use-cases/availability/set-default-availability.use-case';
import { deleteAvailabilityUseCase } from '@/src/application/use-cases/availability/delete-availability.use-case';
import { listAvailabilitiesController } from '@/src/interface-adapters/controllers/availability/list-availabilities.controller';
import { createAvailabilityController } from '@/src/interface-adapters/controllers/availability/create-availability.controller';
import { updateAvailabilityController } from '@/src/interface-adapters/controllers/availability/update-availability.controller';
import { setDefaultAvailabilityController } from '@/src/interface-adapters/controllers/availability/set-default-availability.controller';
import { deleteAvailabilityController } from '@/src/interface-adapters/controllers/availability/delete-availability.controller';

export function createAvailabilityModule() {
    const availabilityModule = createModule();

    availabilityModule.bind(DI_SYMBOLS.IAvailabilityService).toClass(AvailabilityService, [DI_SYMBOLS.IAuthenticationService]);

    availabilityModule.bind(DI_SYMBOLS.IListAvailabilitiesUseCase).toHigherOrderFunction(listAvailabilitiesUseCase, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAvailabilityService,
    ]);

    availabilityModule.bind(DI_SYMBOLS.ICreateAvailabilityUseCase).toHigherOrderFunction(createAvailabilityUseCase, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAvailabilityService,
    ]);

    availabilityModule.bind(DI_SYMBOLS.IUpdateAvailabilityUseCase).toHigherOrderFunction(updateAvailabilityUseCase, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAvailabilityService,
    ]);

    availabilityModule.bind(DI_SYMBOLS.ISetDefaultAvailabilityUseCase).toHigherOrderFunction(setDefaultAvailabilityUseCase, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAvailabilityService,
    ]);

    availabilityModule.bind(DI_SYMBOLS.IDeleteAvailabilityUseCase).toHigherOrderFunction(deleteAvailabilityUseCase, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAvailabilityService,
    ]);

    availabilityModule.bind(DI_SYMBOLS.IListAvailabilitiesController).toHigherOrderFunction(listAvailabilitiesController, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IListAvailabilitiesUseCase,
    ]);

    availabilityModule.bind(DI_SYMBOLS.ICreateAvailabilityController).toHigherOrderFunction(createAvailabilityController, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.ICreateAvailabilityUseCase,
    ]);

    availabilityModule.bind(DI_SYMBOLS.IUpdateAvailabilityController).toHigherOrderFunction(updateAvailabilityController, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IUpdateAvailabilityUseCase,
    ]);

    availabilityModule.bind(DI_SYMBOLS.ISetDefaultAvailabilityController).toHigherOrderFunction(setDefaultAvailabilityController, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.ISetDefaultAvailabilityUseCase,
    ]);

    availabilityModule.bind(DI_SYMBOLS.IDeleteAvailabilityController).toHigherOrderFunction(deleteAvailabilityController, [
        DI_SYMBOLS.IInstrumentationService,
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IDeleteAvailabilityUseCase,
    ]);

    return availabilityModule;
}
