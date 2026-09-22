import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { CrashReporterService } from '@/src/infrastructure/services/crash-reporter.service';
import { InstrumentationService } from '@/src/infrastructure/services/instrumentation.service';

export function createMonitoringModule() {
    const monitoringModule = createModule();

    monitoringModule.bind(DI_SYMBOLS.IInstrumentationService).toClass(InstrumentationService);
    monitoringModule.bind(DI_SYMBOLS.ICrashReporterService).toClass(CrashReporterService);

    return monitoringModule;
}
