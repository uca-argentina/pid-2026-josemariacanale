import { createContainer } from '@evyweb/ioctopus';
import { DI_SYMBOLS, type DI_RETURN_TYPES } from '@/di/types';
import { createAvailabilitiesModule } from '@/di/modules/availabilities.module';
import { createAuthModule } from '@/di/modules/auth.module';
import { createBookingsModule } from '@/di/modules/bookings.module';
import { createBranchesModule } from '@/di/modules/branches.module';
import { createCabinsModule } from '@/di/modules/cabins.module';
import { createBusinessesModule } from '@/di/modules/businesses.module';
import { createEmployeesModule } from '@/di/modules/employees.module';
import { createMonitoringModule } from '@/di/modules/monitoring.module';
import { createOutOfOfficeModule } from '@/di/modules/out-of-office.module';
import { createHolidaysModule } from '@/di/modules/holidays.module';
import { createServicesModule } from '@/di/modules/services.module';
import { createUsersModule } from '@/di/modules/users.module';

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol('MonitoringModule'), createMonitoringModule());
ApplicationContainer.load(Symbol('AuthModule'), createAuthModule());
ApplicationContainer.load(Symbol('BusinessesModule'), createBusinessesModule());
ApplicationContainer.load(Symbol('BranchesModule'), createBranchesModule());
ApplicationContainer.load(Symbol('CabinsModule'), createCabinsModule());
ApplicationContainer.load(Symbol('EmployeesModule'), createEmployeesModule());
ApplicationContainer.load(Symbol('BookingsModule'), createBookingsModule());
ApplicationContainer.load(Symbol('AvailabilitiesModule'), createAvailabilitiesModule());
ApplicationContainer.load(Symbol('OutOfOfficeModule'), createOutOfOfficeModule());
ApplicationContainer.load(Symbol('HolidaysModule'), createHolidaysModule());
ApplicationContainer.load(Symbol('ServicesModule'), createServicesModule());
ApplicationContainer.load(Symbol('UsersModule'), createUsersModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(symbol: K): DI_RETURN_TYPES[K] {
    return ApplicationContainer.get<DI_RETURN_TYPES[K]>(DI_SYMBOLS[symbol]);
}
