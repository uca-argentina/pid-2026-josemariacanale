import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';
import { emptySchedule, Schedule } from './domain/availabilities/availability';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from './domain/availabilities/availabilities.repository';
import {
  BRANCH_IMAGES_REPOSITORY,
  BranchImagesRepository,
} from './domain/branch-images/branch-images.repository';
import { Branch } from './domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from './domain/branches/branches.repository';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from './domain/bookings/bookings.repository';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from './domain/bookings/booking-verification-codes';
import { Business } from './domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from './domain/businesses/businesses.repository';
import { CLOCK, Clock } from './domain/clock';
import { UnauthenticatedError } from './domain/errors';
import { FILE_STORAGE, FileStorage } from './domain/file-storage';
import { Employee } from './domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from './domain/employees/employees.repository';
import {
  INVITATIONS_REPOSITORY,
  InvitationsRepository,
} from './domain/invitations/invitations.repository';
import { Mailer, MAILER } from './domain/mailer';
import { Service, ServiceCategory } from './domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from './domain/services/services.repository';
import {
  CLERK_AUTH,
  ClerkAuth,
  ClerkIdentity,
} from './domain/users/clerk-auth';
import { User } from './domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from './domain/users/users.repository';

/** Monday to Friday, one range a day; the weekend is not worked. */
export const workWeek = (start: string, end: string): Schedule =>
  emptySchedule().map((_, day) =>
    day >= 1 && day <= 5 ? [{ start, end }] : [],
  );

export const DAY_MS = 24 * 60 * 60 * 1000;

export class TestClock implements Clock {
  private current = new Date('2026-01-01T12:00:00.000Z');

  now() {
    return new Date(this.current);
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/**
 * The full app as main.ts configures it, with a controllable Clock and every other outward port a Jest mock
 * for the test to script and inspect, so no database is needed.
 */
export async function createTestApp() {
  const clock = new TestClock();
  const users: jest.Mocked<UsersRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByClerkId: jest.fn(),
    findByEmail: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    retire: jest.fn(),
  };
  const mailer: jest.Mocked<Mailer> = {
    sendVerificationCode: jest.fn(),
    sendBookingConfirmation: jest.fn(),
  };
  const bookingCodes: jest.Mocked<BookingVerificationCodes> = {
    request: jest.fn(),
    // Most tests exercise paths past code verification; the few testing an invalid code override this.
    verify: jest.fn().mockReturnValue(true),
  };
  const fileStorage: jest.Mocked<FileStorage> = {
    upload: jest.fn(),
    delete: jest.fn(),
  };
  const clerkAuth: jest.Mocked<ClerkAuth> = {
    verifyToken: jest.fn<Promise<ClerkIdentity>, [string | undefined]>(
      async () => {
        throw new UnauthenticatedError('Missing or invalid Clerk token');
      },
    ),
    getProfile: jest.fn(),
    inviteByEmail: jest.fn(),
    deleteUser: jest.fn(),
  };
  const businesses: jest.Mocked<BusinessesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    listByOwner: jest.fn(),
    update: jest.fn(),
  };
  const branches: jest.Mocked<BranchesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    listByBusiness: jest.fn(),
    update: jest.fn(),
  };
  const branchImages: jest.Mocked<BranchImagesRepository> = {
    listByBranch: jest.fn(),
    findById: jest.fn(),
    append: jest.fn(),
    delete: jest.fn(),
    reorder: jest.fn(),
  };
  const employees: jest.Mocked<EmployeesRepository> = {
    listByIds: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    listActiveByBusiness: jest.fn(),
    listActiveByUser: jest.fn(),
    retire: jest.fn(),
  };
  const invitations: jest.Mocked<InvitationsRepository> = {
    findPending: jest.fn(),
    create: jest.fn(),
    listPending: jest.fn(),
    findById: jest.fn(),
    listPendingByEmail: jest.fn(),
    close: jest.fn(),
    renew: jest.fn(),
  };
  const services: jest.Mocked<ServicesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    listActiveByBranch: jest.fn(),
    findActiveBySlug: jest.fn(),
    createPersonal: jest.fn(),
    listActiveByUser: jest.fn(),
    findActiveByUserSlug: jest.fn(),
    update: jest.fn(),
    retire: jest.fn(),
    addEmployee: jest.fn(),
    setEmployeeAvailability: jest.fn(),
    removeEmployee: jest.fn(),
    listActiveByEmployee: jest.fn(),
    findEmployeeLink: jest.fn(),
  };
  const bookings: jest.Mocked<BookingsRepository> = {
    create: jest.fn(),
    lastReceivedByEmployee: jest.fn(),
    listOccupiedStartsByService: jest.fn(),
    findById: jest.fn(),
    resolvePending: jest.fn(),
    findByLink: jest.fn(),
    listByBusiness: jest.fn(),
    listOccupiedByUser: jest.fn(),
    listByEmployees: jest.fn(),
    cancel: jest.fn(),
    cancelPendingOrBooked: jest.fn(),
    reschedule: jest.fn(),
    reschedulePendingOrBooked: jest.fn(),
    markNoShow: jest.fn(),
  };
  const availabilities: jest.Mocked<AvailabilitiesRepository> = {
    listByUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    replace: jest.fn(),
    makeDefault: jest.fn(),
    countServices: jest.fn(),
    delete: jest.fn(),
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(USERS_REPOSITORY)
    .useValue(users)
    .overrideProvider(CLERK_AUTH)
    .useValue(clerkAuth)
    .overrideProvider(MAILER)
    .useValue(mailer)
    .overrideProvider(FILE_STORAGE)
    .useValue(fileStorage)
    .overrideProvider(BUSINESSES_REPOSITORY)
    .useValue(businesses)
    .overrideProvider(BRANCHES_REPOSITORY)
    .useValue(branches)
    .overrideProvider(BRANCH_IMAGES_REPOSITORY)
    .useValue(branchImages)
    .overrideProvider(SERVICES_REPOSITORY)
    .useValue(services)
    .overrideProvider(EMPLOYEES_REPOSITORY)
    .useValue(employees)
    .overrideProvider(INVITATIONS_REPOSITORY)
    .useValue(invitations)
    .overrideProvider(BOOKINGS_REPOSITORY)
    .useValue(bookings)
    .overrideProvider(BOOKING_VERIFICATION_CODES)
    .useValue(bookingCodes)
    .overrideProvider(AVAILABILITIES_REPOSITORY)
    .useValue(availabilities)
    .compile();
  const app = setupApp(moduleRef.createNestApplication());
  await app.init();
  return {
    app,
    clock,
    users,
    clerkAuth,
    mailer,
    fileStorage,
    businesses,
    branches,
    branchImages,
    services,
    employees,
    invitations,
    bookings,
    bookingCodes,
    availabilities,
    http: request(app.getHttpServer()),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export const ANA: User = {
  id: 1,
  clerkId: 'user_clerk_ana',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  slug: null,
  imageUrl: null,
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
  deletedAt: null,
};

export const BRUNO: User = {
  id: 2,
  clerkId: 'user_clerk_bruno',
  name: 'Bruno Díaz',
  email: 'bruno@example.com',
  slug: null,
  imageUrl: null,
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
  deletedAt: null,
};

export const ANAS_BUSINESS: Business = {
  id: 1,
  name: "Ana's Salon",
  description: 'Hair and nails',
  ownerId: ANA.id,
  slug: 'anas-salon',
  deletedAt: null,
};

export const ANAS_BRANCH: Branch = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  name: 'Downtown',
  address: '123 Main St',
  timeZone: 'America/Argentina/Buenos_Aires',
  slug: 'downtown',
};

/** Ana as the Empleado of her own Negocio. */
export const ANAS_EMPLOYEE: Employee = {
  id: 1,
  userId: ANA.id,
  businessId: ANAS_BUSINESS.id,
  name: ANA.name,
  email: ANA.email,
  imageUrl: ANA.imageUrl,
  deletedAt: null,
};

/** A Servicio of Ana's Sucursal, attended by Ana. */
export const ANAS_SERVICE: Service = {
  id: 1,
  branchId: ANAS_BRANCH.id,
  userId: null,
  availabilityId: null,
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: 20,
  depositPercent: null,
  requiresApproval: false,
  deletedAt: null,
  slug: 'haircut',
  hidden: false,
  prepMinutes: 0,
  dailyLimit: null,
  slotInterval: null,
  minimumNoticeMinutes: 0,
  employees: [
    {
      id: ANAS_EMPLOYEE.id,
      name: ANAS_EMPLOYEE.name,
      availabilityId: 10,
      userId: ANA.id,
      imageUrl: ANAS_EMPLOYEE.imageUrl,
    },
  ],
};

export const CLERK_TOKEN = 'clerk-jwt-1';
export const OTHER_CLERK_TOKEN = 'clerk-jwt-2';

/** Makes `bearer(CLERK_TOKEN)` resolve to Ana, an already-known local User. */
export function scriptSession({ clerkAuth, users }: TestApp) {
  const verifyToken = clerkAuth.verifyToken.getMockImplementation()!;
  clerkAuth.verifyToken.mockImplementation(async (token) =>
    token === CLERK_TOKEN ? { clerkId: ANA.clerkId } : verifyToken(token),
  );
  const findByClerkId = users.findByClerkId.getMockImplementation();
  users.findByClerkId.mockImplementation(async (clerkId) =>
    clerkId === ANA.clerkId ? ANA : (findByClerkId?.(clerkId) ?? null),
  );
}

/** Makes `bearer(OTHER_CLERK_TOKEN)` resolve to Bruno, alongside Ana's from scriptSession. */
export function scriptOtherSession({ clerkAuth, users }: TestApp) {
  const verifyToken = clerkAuth.verifyToken.getMockImplementation()!;
  clerkAuth.verifyToken.mockImplementation(async (token) =>
    token === OTHER_CLERK_TOKEN
      ? { clerkId: BRUNO.clerkId }
      : verifyToken(token),
  );
  const findByClerkId = users.findByClerkId.getMockImplementation();
  users.findByClerkId.mockImplementation(async (clerkId) =>
    clerkId === BRUNO.clerkId ? BRUNO : (findByClerkId?.(clerkId) ?? null),
  );
}

export const bearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
