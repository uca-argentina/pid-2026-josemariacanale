import { Booking, BookingStatus } from '../../../domain/bookings/booking';
import { BookingsRepository } from '../../../domain/bookings/bookings.repository';
import { BusinessRuleError, NotFoundError } from '../../../domain/errors';
import { PayDepositUseCase } from '../pay-deposit.use-case';

describe('PayDepositUseCase', () => {
  let useCase: PayDepositUseCase;
  let bookings: jest.Mocked<BookingsRepository>;

  const BOOKING: Booking = {
    id: 10,
    serviceId: 1,
    employeeId: 2,
    clientName: 'Juan Pérez',
    clientEmail: 'juan@example.com',
    startsAt: new Date('2026-05-01T14:00:00.000Z'),
    endsAt: new Date('2026-05-01T15:00:00.000Z'),
    status: BookingStatus.PENDIENTE_SENA,
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
    useCase = new PayDepositUseCase(bookings);
  });

  it('transitions PENDIENTE_SENA to CONFIRMADO', async () => {
    bookings.findById.mockResolvedValue(BOOKING);
    bookings.updateStatus.mockResolvedValue({
      ...BOOKING,
      status: BookingStatus.CONFIRMADO,
    });

    const result = await useCase.execute(10);

    expect(bookings.updateStatus).toHaveBeenCalledWith(
      10,
      BookingStatus.CONFIRMADO,
    );
    expect(result.status).toBe(BookingStatus.CONFIRMADO);
  });

  it('returns already confirmed booking without error', async () => {
    bookings.findById.mockResolvedValue({
      ...BOOKING,
      status: BookingStatus.CONFIRMADO,
    });

    const result = await useCase.execute(10);

    expect(bookings.updateStatus).not.toHaveBeenCalled();
    expect(result.status).toBe(BookingStatus.CONFIRMADO);
  });

  it('throws NotFoundError for unknown booking', async () => {
    bookings.findById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws BusinessRuleError for cancelled booking', async () => {
    bookings.findById.mockResolvedValue({
      ...BOOKING,
      status: BookingStatus.CANCELADO,
    });

    await expect(useCase.execute(10)).rejects.toBeInstanceOf(BusinessRuleError);
  });
});
