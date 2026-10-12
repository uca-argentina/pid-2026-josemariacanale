import { Global, Module } from '@nestjs/common';
import { AVAILABILITIES_REPOSITORY } from '../domain/availabilities/availabilities.repository';
import { CLOCK, Clock } from '../domain/clock';
import { FILE_STORAGE } from '../domain/file-storage';
import { MAILER } from '../domain/mailer';
import { BRANCH_IMAGES_REPOSITORY } from '../domain/branch-images/branch-images.repository';
import { BOOKINGS_REPOSITORY } from '../domain/bookings/bookings.repository';
import { BOOKING_VERIFICATION_CODES } from '../domain/bookings/booking-verification-codes';
import { BRANCHES_REPOSITORY } from '../domain/branches/branches.repository';
import { BUSINESSES_REPOSITORY } from '../domain/businesses/businesses.repository';
import { EMPLOYEES_REPOSITORY } from '../domain/employees/employees.repository';
import { GOOGLE_CALENDAR_CLIENT } from '../domain/holidays/google-calendar-client';
import { HOLIDAYS_REPOSITORY } from '../domain/holidays/holidays.repository';
import { USER_HOLIDAY_SETTINGS_REPOSITORY } from '../domain/holidays/user-holiday-settings.repository';
import { INVITATIONS_REPOSITORY } from '../domain/invitations/invitations.repository';
import { OUT_OF_OFFICE_REPOSITORY } from '../domain/out-of-office/out-of-office.repository';
import { SERVICES_REPOSITORY } from '../domain/services/services.repository';
import { CLERK_AUTH } from '../domain/users/clerk-auth';
import { USERS_REPOSITORY } from '../domain/users/users.repository';
import { AvailabilitiesModule } from './availabilities/availabilities.module';
import { PrismaAvailabilitiesRepository } from './availabilities/prisma-availabilities.repository';
import { PrismaBookingsRepository } from './bookings/prisma-bookings.repository';
import { readBookingCodeSecret, TotpBookingVerificationCodes } from './bookings/totp-booking-verification-codes';
import { BookingsModule } from './bookings/bookings.module';
import { BranchImagesModule } from './branch-images/branch-images.module';
import { PrismaBranchImagesRepository } from './branch-images/prisma-branch-images.repository';
import { PrismaBranchesRepository } from './branches/prisma-branches.repository';
import { BranchesModule } from './branches/branches.module';
import { PrismaBusinessesRepository } from './businesses/prisma-businesses.repository';
import { BusinessesModule } from './businesses/businesses.module';
import { PrismaEmployeesRepository } from './employees/prisma-employees.repository';
import { EmployeesModule } from './employees/employees.module';
import { GoogleCalendarApiClient } from './holidays/google-calendar-api.client';
import { HolidaysModule } from './holidays/holidays.module';
import { PrismaHolidaysRepository } from './holidays/prisma-holidays.repository';
import { PrismaUserHolidaySettingsRepository } from './holidays/prisma-user-holiday-settings.repository';
import { PrismaInvitationsRepository } from './invitations/prisma-invitations.repository';
import { OutOfOfficeModule } from './out-of-office/out-of-office.module';
import { PrismaOutOfOfficeRepository } from './out-of-office/prisma-out-of-office.repository';
import { NodemailerMailer } from './nodemailer-mailer';
import { PrismaService } from './prisma.service';
import { readS3Config, S3FileStorage } from './s3-file-storage';
import { PrismaServicesRepository } from './services/prisma-services.repository';
import { ServicesModule } from './services/services.module';
import { SlugsModule } from './slugs/slugs.module';
import { SystemClock } from './system-clock';
import { ClerkBackendAuth } from './users/clerk-backend-auth';
import { PrismaUsersRepository } from './users/prisma-users.repository';
import { UsersModule } from './users/users.module';

/** Binds every port to its adapter, globally, and wires the REST feature modules. */
@Global()
@Module({
  imports: [
    UsersModule,
    BusinessesModule,
    BranchesModule,
    BranchImagesModule,
    ServicesModule,
    EmployeesModule,
    BookingsModule,
    AvailabilitiesModule,
    OutOfOfficeModule,
    SlugsModule,
    HolidaysModule,
  ],
  providers: [
    PrismaService,
    { provide: CLOCK, useClass: SystemClock },
    { provide: MAILER, useClass: NodemailerMailer },
    {
      provide: FILE_STORAGE,
      useFactory: () => new S3FileStorage(readS3Config()),
    },
    { provide: CLERK_AUTH, useClass: ClerkBackendAuth },
    { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository },
    { provide: BUSINESSES_REPOSITORY, useClass: PrismaBusinessesRepository },
    { provide: BRANCHES_REPOSITORY, useClass: PrismaBranchesRepository },
    {
      provide: BRANCH_IMAGES_REPOSITORY,
      useClass: PrismaBranchImagesRepository,
    },
    { provide: SERVICES_REPOSITORY, useClass: PrismaServicesRepository },
    { provide: EMPLOYEES_REPOSITORY, useClass: PrismaEmployeesRepository },
    {
      provide: INVITATIONS_REPOSITORY,
      useClass: PrismaInvitationsRepository,
    },
    { provide: BOOKINGS_REPOSITORY, useClass: PrismaBookingsRepository },
    {
      provide: BOOKING_VERIFICATION_CODES,
      useFactory: (clock: Clock) =>
        new TotpBookingVerificationCodes(readBookingCodeSecret(), clock),
      inject: [CLOCK],
    },
    {
      provide: AVAILABILITIES_REPOSITORY,
      useClass: PrismaAvailabilitiesRepository,
    },
    {
      provide: OUT_OF_OFFICE_REPOSITORY,
      useClass: PrismaOutOfOfficeRepository,
    },
    { provide: HOLIDAYS_REPOSITORY, useClass: PrismaHolidaysRepository },
    {
      provide: USER_HOLIDAY_SETTINGS_REPOSITORY,
      useClass: PrismaUserHolidaySettingsRepository,
    },
    { provide: GOOGLE_CALENDAR_CLIENT, useClass: GoogleCalendarApiClient },
  ],
  exports: [
    CLOCK,
    MAILER,
    FILE_STORAGE,
    CLERK_AUTH,
    USERS_REPOSITORY,
    BUSINESSES_REPOSITORY,
    BRANCHES_REPOSITORY,
    BRANCH_IMAGES_REPOSITORY,
    SERVICES_REPOSITORY,
    EMPLOYEES_REPOSITORY,
    INVITATIONS_REPOSITORY,
    BOOKINGS_REPOSITORY,
    BOOKING_VERIFICATION_CODES,
    AVAILABILITIES_REPOSITORY,
    OUT_OF_OFFICE_REPOSITORY,
    HOLIDAYS_REPOSITORY,
    USER_HOLIDAY_SETTINGS_REPOSITORY,
    GOOGLE_CALENDAR_CLIENT,
  ],
})
export class InfrastructureModule {}
