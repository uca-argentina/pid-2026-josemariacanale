import { createContainer } from '@evyweb/ioctopus';
import { DI_SYMBOLS, type DI_RETURN_TYPES } from '@/di/types';
import { createAvailabilitiesModule } from '@/di/modules/availabilities.module';
import { createAuthModule } from '@/di/modules/auth.module';
import { createBookingsModule } from '@/di/modules/bookings.module';
import { createBusinessesModule } from '@/di/modules/businesses.module';
import { createEmployeesModule } from '@/di/modules/employees.module';
import { createMonitoringModule } from '@/di/modules/monitoring.module';
import { createServicesModule } from '@/di/modules/services.module';
import { createUsersModule } from '@/di/modules/users.module';

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol('MonitoringModule'), createMonitoringModule());
ApplicationContainer.load(Symbol('AuthModule'), createAuthModule());
ApplicationContainer.load(Symbol('BusinessesModule'), createBusinessesModule());
ApplicationContainer.load(Symbol('EmployeesModule'), createEmployeesModule());
ApplicationContainer.load(Symbol('BookingsModule'), createBookingsModule());
ApplicationContainer.load(Symbol('AvailabilitiesModule'), createAvailabilitiesModule());
ApplicationContainer.load(Symbol('ServicesModule'), createServicesModule());
ApplicationContainer.load(Symbol('UsersModule'), createUsersModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(symbol: K): DI_RETURN_TYPES[K] {
    return ApplicationContainer.get<DI_RETURN_TYPES[K]>(DI_SYMBOLS[symbol]);
}
