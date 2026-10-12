import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { getBusinessAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-business-analytics.use-case';
import { listAnalyticsBusinessesUseCase } from '@/src/application/use-cases/analytics/list-analytics-businesses.use-case';
import { getPersonalAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-personal-analytics.use-case';
import { AnalyticsRepository } from '@/src/infrastructure/repositories/analytics.repository';
import { getBusinessAnalyticsController } from '@/src/interface-adapters/controllers/analytics/get-business-analytics.controller';
import { listAnalyticsBusinessesController } from '@/src/interface-adapters/controllers/analytics/list-analytics-businesses.controller';
import { getPersonalAnalyticsController } from '@/src/interface-adapters/controllers/analytics/get-personal-analytics.controller';

export function createAnalyticsModule() {
    const analyticsModule = createModule();

    analyticsModule.bind(DI_SYMBOLS.IAnalyticsRepository).toClass(AnalyticsRepository, [
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IInstrumentationService,
    ]);

    analyticsModule
        .bind(DI_SYMBOLS.IGetPersonalAnalyticsUseCase)
        .toHigherOrderFunction(getPersonalAnalyticsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAnalyticsRepository]);

    analyticsModule
        .bind(DI_SYMBOLS.IGetPersonalAnalyticsController)
        .toHigherOrderFunction(getPersonalAnalyticsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetPersonalAnalyticsUseCase,
        ]);

    analyticsModule
        .bind(DI_SYMBOLS.IGetBusinessAnalyticsUseCase)
        .toHigherOrderFunction(getBusinessAnalyticsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAnalyticsRepository]);

    analyticsModule
        .bind(DI_SYMBOLS.IGetBusinessAnalyticsController)
        .toHigherOrderFunction(getBusinessAnalyticsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetBusinessAnalyticsUseCase,
        ]);

    analyticsModule
        .bind(DI_SYMBOLS.IListAnalyticsBusinessesUseCase)
        .toHigherOrderFunction(listAnalyticsBusinessesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAnalyticsRepository]);

    analyticsModule
        .bind(DI_SYMBOLS.IListAnalyticsBusinessesController)
        .toHigherOrderFunction(listAnalyticsBusinessesController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListAnalyticsBusinessesUseCase,
        ]);

    return analyticsModule;
}
