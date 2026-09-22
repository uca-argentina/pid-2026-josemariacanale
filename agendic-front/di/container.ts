import { createContainer } from '@evyweb/ioctopus';
import { DI_SYMBOLS, type DI_RETURN_TYPES } from '@/di/types';
import { createAuthModule } from '@/di/modules/auth.module';
import { createMonitoringModule } from '@/di/modules/monitoring.module';

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol('MonitoringModule'), createMonitoringModule());
ApplicationContainer.load(Symbol('AuthModule'), createAuthModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(symbol: K): DI_RETURN_TYPES[K] {
    return ApplicationContainer.get<DI_RETURN_TYPES[K]>(DI_SYMBOLS[symbol]);
}
