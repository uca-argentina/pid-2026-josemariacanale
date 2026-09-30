import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { listAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import { createAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import { updateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import { makeAvailabilityDefaultUseCase } from '@/src/application/use-cases/availabilities/make-availability-default.use-case';
import { deleteAvailabilityUseCase } from '@/src/application/use-cases/availabilities/delete-availability.use-case';
import { AvailabilitiesRepository } from '@/src/infrastructure/repositories/availabilities.repository';
import { listStaffAvailabilitiesController } from '@/src/interface-adapters/controllers/availabilities/list-staff-availabilities.controller';
import { createAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/create-availability.controller';
import { updateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/update-availability.controller';
import { makeAvailabilityDefaultController } from '@/src/interface-adapters/controllers/availabilities/make-availability-default.controller';
import { deleteAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/delete-availability.controller';

export function createAvailabilitiesModule() {
    const availabilitiesModule = createModule();

    availabilitiesModule.bind(DI_SYMBOLS.IAvailabilitiesRepository).toClass(AvailabilitiesRepository, [DI_SYMBOLS.IAuthenticationService]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IListAvailabilitiesUseCase)
        .toHigherOrderFunction(listAvailabilitiesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAvailabilitiesRepository]);

    availabilitiesModule
        .bind(DI_SYMBOLS.ICreateAvailabilityUseCase)
        .toHigherOrderFunction(createAvailabilityUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAvailabilitiesRepository]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IUpdateAvailabilityUseCase)
        .toHigherOrderFunction(updateAvailabilityUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAvailabilitiesRepository]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IMakeAvailabilityDefaultUseCase)
        .toHigherOrderFunction(makeAvailabilityDefaultUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAvailabilitiesRepository]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IDeleteAvailabilityUseCase)
        .toHigherOrderFunction(deleteAvailabilityUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAvailabilitiesRepository]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IListStaffAvailabilitiesController)
        .toHigherOrderFunction(listStaffAvailabilitiesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListBusinessesUseCase,
            DI_SYMBOLS.IListEmployeesUseCase,
            DI_SYMBOLS.IListAvailabilitiesUseCase,
        ]);

    availabilitiesModule
        .bind(DI_SYMBOLS.ICreateAvailabilityController)
        .toHigherOrderFunction(createAvailabilityController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICreateAvailabilityUseCase,
        ]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IUpdateAvailabilityController)
        .toHigherOrderFunction(updateAvailabilityController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateAvailabilityUseCase,
        ]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IMakeAvailabilityDefaultController)
        .toHigherOrderFunction(makeAvailabilityDefaultController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IMakeAvailabilityDefaultUseCase,
        ]);

    availabilitiesModule
        .bind(DI_SYMBOLS.IDeleteAvailabilityController)
        .toHigherOrderFunction(deleteAvailabilityController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IDeleteAvailabilityUseCase,
        ]);

    return availabilitiesModule;
}
