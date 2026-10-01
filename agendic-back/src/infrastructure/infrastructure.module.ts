import { Global, Module } from '@nestjs/common';
import { AVAILABILITIES_REPOSITORY } from '../domain/availabilities/availabilities.repository';
import { AVAILABILITY_OVERRIDES_REPOSITORY } from '../domain/availability-overrides/availability-overrides.repository';
import { CLOCK } from '../domain/clock';
import { FILE_STORAGE } from '../domain/file-storage';
import { MAILER } from '../domain/mailer';
import { BRANCH_IMAGES_REPOSITORY } from '../domain/branch-images/branch-images.repository';
import { BOOKINGS_REPOSITORY } from '../domain/bookings/bookings.repository';
import { BRANCHES_REPOSITORY } from '../domain/branches/branches.repository';
import { BUSINESSES_REPOSITORY } from '../domain/businesses/businesses.repository';
import { EMPLOYEES_REPOSITORY } from '../domain/employees/employees.repository';
import { INVITATIONS_REPOSITORY } from '../domain/invitations/invitations.repository';
import { SERVICES_REPOSITORY } from '../domain/services/services.repository';
import { CLERK_AUTH } from '../domain/users/clerk-auth';
import { USERS_REPOSITORY } from '../domain/users/users.repository';
import { AvailabilitiesModule } from './availabilities/availabilities.module';
import { PrismaAvailabilitiesRepository } from './availabilities/prisma-availabilities.repository';
import { AvailabilityOverridesModule } from './availability-overrides/availability-overrides.module';
import { PrismaAvailabilityOverridesRepository } from './availability-overrides/prisma-availability-overrides.repository';
import { PrismaBookingsRepository } from './bookings/prisma-bookings.repository';
import { BookingsModule } from './bookings/bookings.module';
import { BranchImagesModule } from './branch-images/branch-images.module';
import { PrismaBranchImagesRepository } from './branch-images/prisma-branch-images.repository';
import { PrismaBranchesRepository } from './branches/prisma-branches.repository';
import { BranchesModule } from './branches/branches.module';
import { PrismaBusinessesRepository } from './businesses/prisma-businesses.repository';
import { BusinessesModule } from './businesses/businesses.module';
import { PrismaEmployeesRepository } from './employees/prisma-employees.repository';
import { EmployeesModule } from './employees/employees.module';
import { PrismaInvitationsRepository } from './invitations/prisma-invitations.repository';
import { NodemailerMailer } from './nodemailer-mailer';
import { PrismaService } from './prisma.service';
import { readS3Config, S3FileStorage } from './s3-file-storage';
import { PrismaServicesRepository } from './services/prisma-services.repository';
import { ServicesModule } from './services/services.module';
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
    AvailabilityOverridesModule,
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
      provide: AVAILABILITIES_REPOSITORY,
      useClass: PrismaAvailabilitiesRepository,
    },
    {
      provide: AVAILABILITY_OVERRIDES_REPOSITORY,
      useClass: PrismaAvailabilityOverridesRepository,
    },
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
    AVAILABILITIES_REPOSITORY,
    AVAILABILITY_OVERRIDES_REPOSITORY,
  ],
})
export class InfrastructureModule {}
