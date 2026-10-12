import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { getPersonalAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-personal-analytics.use-case';
import { AnalyticsRepository } from '@/src/infrastructure/repositories/analytics.repository';
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

    return analyticsModule;
}
