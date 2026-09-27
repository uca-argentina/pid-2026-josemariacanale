import { Booking, BookingStatus } from '../../../domain/bookings/booking';
import { BookingsRepository } from '../../../domain/bookings/bookings.repository';
import { Branch } from '../../../domain/branches/branch';
import { BranchesRepository } from '../../../domain/branches/branches.repository';
import { Business } from '../../../domain/businesses/business';
import { BusinessesRepository } from '../../../domain/businesses/businesses.repository';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '../../../domain/errors';
import { Service, ServiceCategory } from '../../../domain/services/service';
import { ServicesRepository } from '../../../domain/services/services.repository';
import { UpdateBookingStatusUseCase } from '../update-booking-status.use-case';

describe('UpdateBookingStatusUseCase', () => {
  let useCase: UpdateBookingStatusUseCase;
  let bookings: jest.Mocked<BookingsRepository>;
  let services: jest.Mocked<ServicesRepository>;
  let branches: jest.Mocked<BranchesRepository>;
  let businesses: jest.Mocked<BusinessesRepository>;

  const OWNER_ID = 1;
  const OTHER_USER_ID = 99;

  const BUSINESS: Business = {
    id: 1,
    ownerId: OWNER_ID,
    name: 'Vitalia',
    description: 'Centro de bienestar',
    slug: 'vitalia',
  };

  const BRANCH: Branch = {
    id: 10,
    businessId: BUSINESS.id,
    name: 'Centro',
    address: 'Av. Corrientes 1000',
    opensAt: '09:00',
    closesAt: '18:00',
    timeZone: 'America/Argentina/Buenos_Aires',
  };

  const SERVICE: Service = {
    id: 100,
    branchId: BRANCH.id,
    name: 'Masaje',
    description: null,
    category: ServiceCategory.SPA,
    durationMinutes: 60,
    price: 10000,
    retiredAt: null,
    employees: [],
  };

  const BOOKING: Booking = {
    id: 50,
    serviceId: SERVICE.id,
    employeeId: 2,
    clientName: 'María López',
    clientEmail: 'maria@example.com',
    startsAt: new Date('2026-05-01T14:00:00.000Z'),
    endsAt: new Date('2026-05-01T15:00:00.000Z'),
    status: BookingStatus.CONFIRMADO,
  };

  beforeEach(() => {
    bookings = {
      create: jest.fn(),
      findById: jest.fn(),
      hasOverlappingBooked: jest.fn(),
      findByVerificationToken: jest.fn(),
      markBooked: jest.fn(),
      updateStatus: jest.fn(),
      listByBusiness: jest.fn(),
      listBookedByEmployee: jest.fn(),
    };
    services = {
      create: jest.fn(),
      findById: jest.fn(),
      listActiveByBranch: jest.fn(),
      update: jest.fn(),
      retire: jest.fn(),
      addEmployee: jest.fn(),
      removeEmployee: jest.fn(),
      listActiveByEmployee: jest.fn(),
      findEmployeeLink: jest.fn(),
    };
    branches = {
      create: jest.fn(),
      findById: jest.fn(),
      listByBusiness: jest.fn(),
      update: jest.fn(),
    };
    businesses = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      listByOwner: jest.fn(),
      update: jest.fn(),
    };

    useCase = new UpdateBookingStatusUseCase(
      bookings,
      services,
      branches,
      businesses,
    );

    bookings.findById.mockResolvedValue(BOOKING);
    services.findById.mockResolvedValue(SERVICE);
    branches.findById.mockResolvedValue(BRANCH);
    businesses.findById.mockResolvedValue(BUSINESS);
  });

  it('updates status to ATENDIDO for business owner', async () => {
    bookings.updateStatus.mockResolvedValue({
      ...BOOKING,
      status: BookingStatus.ATENDIDO,
    });

    const result = await useCase.execute(
      OWNER_ID,
      BOOKING.id,
      BookingStatus.ATENDIDO,
    );

    expect(bookings.updateStatus).toHaveBeenCalledWith(
      BOOKING.id,
      BookingStatus.ATENDIDO,
    );
    expect(result.status).toBe(BookingStatus.ATENDIDO);
  });

  it('updates status to NO_PRESENTADO', async () => {
    bookings.updateStatus.mockResolvedValue({
      ...BOOKING,
      status: BookingStatus.NO_PRESENTADO,
    });

    const result = await useCase.execute(
      OWNER_ID,
      BOOKING.id,
      BookingStatus.NO_PRESENTADO,
    );

    expect(bookings.updateStatus).toHaveBeenCalledWith(
      BOOKING.id,
      BookingStatus.NO_PRESENTADO,
    );
    expect(result.status).toBe(BookingStatus.NO_PRESENTADO);
  });

  it('updates status to CANCELADO', async () => {
    bookings.updateStatus.mockResolvedValue({
      ...BOOKING,
      status: BookingStatus.CANCELADO,
    });

    const result = await useCase.execute(
      OWNER_ID,
      BOOKING.id,
      BookingStatus.CANCELADO,
    );

    expect(bookings.updateStatus).toHaveBeenCalledWith(
      BOOKING.id,
      BookingStatus.CANCELADO,
    );
    expect(result.status).toBe(BookingStatus.CANCELADO);
  });

  it('throws ForbiddenError if user is not the business owner', async () => {
    await expect(
      useCase.execute(OTHER_USER_ID, BOOKING.id, BookingStatus.ATENDIDO),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws NotFoundError if booking does not exist', async () => {
    bookings.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(OWNER_ID, 999, BookingStatus.ATENDIDO),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws BusinessRuleError when attempting to reactivate cancelled booking', async () => {
    bookings.findById.mockResolvedValue({
      ...BOOKING,
      status: BookingStatus.CANCELADO,
    });

    await expect(
      useCase.execute(OWNER_ID, BOOKING.id, BookingStatus.ATENDIDO),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});
