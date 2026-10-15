import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { HolidaysRepository } from '@/src/infrastructure/repositories/holidays.repository';
import { listHolidayCountriesUseCase } from '@/src/application/use-cases/holidays/list-holiday-countries.use-case';
import { listHolidayCountriesController } from '@/src/interface-adapters/controllers/holidays/list-holiday-countries.controller';
import { getMyHolidaysUseCase } from '@/src/application/use-cases/holidays/get-my-holidays.use-case';
import { getMyHolidaysController } from '@/src/interface-adapters/controllers/holidays/get-my-holidays.controller';
import { setHolidayCountryUseCase } from '@/src/application/use-cases/holidays/set-holiday-country.use-case';
import { setHolidayCountryController } from '@/src/interface-adapters/controllers/holidays/set-holiday-country.controller';
import { toggleHolidayUseCase } from '@/src/application/use-cases/holidays/toggle-holiday.use-case';
import { toggleHolidayController } from '@/src/interface-adapters/controllers/holidays/toggle-holiday.controller';
import { previewSetHolidayCountryUseCase } from '@/src/application/use-cases/holidays/preview-set-holiday-country.use-case';
import { previewSetHolidayCountryController } from '@/src/interface-adapters/controllers/holidays/preview-set-holiday-country.controller';
import { previewToggleHolidayUseCase } from '@/src/application/use-cases/holidays/preview-toggle-holiday.use-case';
import { previewToggleHolidayController } from '@/src/interface-adapters/controllers/holidays/preview-toggle-holiday.controller';
import { listHolidayConflictsUseCase } from '@/src/application/use-cases/holidays/list-holiday-conflicts.use-case';
import { listHolidayConflictsController } from '@/src/interface-adapters/controllers/holidays/list-holiday-conflicts.controller';

export function createHolidaysModule() {
    const holidaysModule = createModule();

    holidaysModule.bind(DI_SYMBOLS.IHolidaysRepository).toClass(HolidaysRepository, [
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IInstrumentationService,
    ]);

    holidaysModule
        .bind(DI_SYMBOLS.IListHolidayCountriesUseCase)
        .toHigherOrderFunction(listHolidayCountriesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHolidaysRepository]);

    holidaysModule
        .bind(DI_SYMBOLS.IListHolidayCountriesController)
        .toHigherOrderFunction(listHolidayCountriesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListHolidayCountriesUseCase,
        ]);

    holidaysModule
        .bind(DI_SYMBOLS.IGetMyHolidaysUseCase)
        .toHigherOrderFunction(getMyHolidaysUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHolidaysRepository]);

    holidaysModule
        .bind(DI_SYMBOLS.IGetMyHolidaysController)
        .toHigherOrderFunction(getMyHolidaysController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetMyHolidaysUseCase,
        ]);

    holidaysModule
        .bind(DI_SYMBOLS.ISetHolidayCountryUseCase)
        .toHigherOrderFunction(setHolidayCountryUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHolidaysRepository]);

    holidaysModule
        .bind(DI_SYMBOLS.ISetHolidayCountryController)
        .toHigherOrderFunction(setHolidayCountryController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ISetHolidayCountryUseCase,
        ]);

    holidaysModule
        .bind(DI_SYMBOLS.IToggleHolidayUseCase)
        .toHigherOrderFunction(toggleHolidayUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHolidaysRepository]);

    holidaysModule
        .bind(DI_SYMBOLS.IToggleHolidayController)
        .toHigherOrderFunction(toggleHolidayController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IToggleHolidayUseCase,
        ]);

    holidaysModule
        .bind(DI_SYMBOLS.IListHolidayConflictsUseCase)
        .toHigherOrderFunction(listHolidayConflictsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHolidaysRepository]);

    holidaysModule
        .bind(DI_SYMBOLS.IListHolidayConflictsController)
        .toHigherOrderFunction(listHolidayConflictsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListHolidayConflictsUseCase,
        ]);

    holidaysModule
        .bind(DI_SYMBOLS.IPreviewSetHolidayCountryUseCase)
        .toHigherOrderFunction(previewSetHolidayCountryUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHolidaysRepository]);

    holidaysModule
        .bind(DI_SYMBOLS.IPreviewSetHolidayCountryController)
        .toHigherOrderFunction(previewSetHolidayCountryController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IPreviewSetHolidayCountryUseCase,
        ]);

    holidaysModule
        .bind(DI_SYMBOLS.IPreviewToggleHolidayUseCase)
        .toHigherOrderFunction(previewToggleHolidayUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHolidaysRepository]);

    holidaysModule
        .bind(DI_SYMBOLS.IPreviewToggleHolidayController)
        .toHigherOrderFunction(previewToggleHolidayController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IPreviewToggleHolidayUseCase,
        ]);

    return holidaysModule;
}
