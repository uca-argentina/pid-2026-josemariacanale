import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { NotFoundError } from '../../../domain/errors';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: the Cliente table and its email index are what the migration promises. */
describe('PrismaBookingsRepository (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `client-table-${Date.now()}`;
  const email = `${tag}@example.com`;
  let userId: number;

  const book = (hour: number, clientName: string, clientEmail: string, serviceId: number) =>
    repository.create({
      serviceId,
      employeeId: null,
      userId,
      clientName,
      clientEmail,
      prepStartsAt: new Date(Date.UTC(2031, 0, 1, hour)),
      startsAt: new Date(Date.UTC(2031, 0, 1, hour)),
      endsAt: new Date(Date.UTC(2031, 0, 1, hour + 1)),
      notes: null,
      status: BookingStatus.BOOKED,
    });

  afterAll(async () => {
    // `deleteMany({ where: { userId: undefined } })` matches every row: skip if the test died before creating the User.
    if (userId !== undefined) {
      await prisma.booking.deleteMany({ where: { userId } });
      await prisma.service.deleteMany({ where: { userId } });
      await prisma.availability.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('books each Turno with its own Cliente row, normalizing the email', async () => {
    userId = (
      await prisma.user.create({ data: { clerkId: tag, name: tag, email } })
    ).id;
    const { id: availabilityId } = await prisma.availability.create({
      data: {
        userId,
        name: 'Horas laborables',
        timeZone: 'America/Argentina/Buenos_Aires',
        isDefault: true,
      },
    });
    const { id: serviceId } = await prisma.service.create({
      data: {
        userId,
        availabilityId,
        name: tag,
        slug: tag,
        category: 'CLINICA',
        durationMinutes: 60,
        price: 1,
      },
    });
    const first = await book(10, 'Bruno', email, serviceId);
    const second = await book(12, 'Bruno D.', email, serviceId);
    const third = await book(13, 'Bruno M.', `  ${email.toUpperCase()} `, serviceId);

    expect([first, second, third].map((b) => [b.clientName, b.clientEmail, b.status])).toEqual([
      ['Bruno', email, BookingStatus.BOOKED],
      ['Bruno D.', email, BookingStatus.BOOKED],
      ['Bruno M.', email, BookingStatus.BOOKED],
    ]);
    expect(await prisma.client.count({ where: { email } })).toBe(3);
  }, 60_000);

  it('finds a Turno de un Servicio del Negocio por su Enlace, con su Sucursal y Negocio, y sin Usuario (ADR 0022)', async () => {
    const businessEmail = `biz-${email}`;
    const { id: ownerId } = await prisma.user.create({
      data: { clerkId: `${tag}-biz`, name: tag, email: businessEmail },
    });
    const { id: businessId } = await prisma.business.create({
      data: { name: tag, description: tag, ownerId, slug: tag },
    });
    const { id: branchId } = await prisma.branch.create({
      data: {
        businessId,
        name: 'Downtown',
        address: '123 Main St',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'downtown',
      },
    });
    const { id: employeeId } = await prisma.employee.create({
      data: { userId: ownerId, businessId },
    });
    const { id: serviceId } = await prisma.service.create({
      data: {
        branchId,
        name: `${tag}-service`,
        slug: `${tag}-service`,
        category: 'CLINICA',
        durationMinutes: 30,
        price: 20,
      },
    });

    try {
      const created = await repository.create({
        serviceId,
        employeeId,
        userId: ownerId,
        clientName: 'Carla',
        clientEmail: businessEmail,
        prepStartsAt: new Date(Date.UTC(2031, 0, 2, 10)),
        startsAt: new Date(Date.UTC(2031, 0, 2, 10)),
        endsAt: new Date(Date.UTC(2031, 0, 2, 10, 30)),
        notes: null,
        status: BookingStatus.BOOKED,
      });

      const found = await repository.findByLink(created.link);

      expect(found).toMatchObject({
        timeZone: 'America/Argentina/Buenos_Aires',
        employeeName: tag,
        service: {
          name: `${tag}-service`,
          durationMinutes: 30,
          price: 20,
          depositPercent: null,
        },
        business: { name: tag, slug: tag },
        branch: { name: 'Downtown', slug: 'downtown', address: '123 Main St', coverUrl: null },
        user: null,
      });
    } finally {
      await prisma.booking.deleteMany({ where: { userId: ownerId } });
      await prisma.service.deleteMany({ where: { branchId } });
      await prisma.employee.deleteMany({ where: { userId: ownerId } });
      await prisma.branch.deleteMany({ where: { businessId } });
      await prisma.business.deleteMany({ where: { id: businessId } });
      await prisma.user.delete({ where: { id: ownerId } });
    }
  }, 60_000);

  it('finds a Turno de un Servicio personal por su Enlace del Turno, único y generado al crear, con el Enlace de reserva del Usuario; 404 si no existe (ADR 0022)', async () => {
    const linkEmail = `link-${email}`;
    const { id: linkUserId } = await prisma.user.create({
      data: { clerkId: `${tag}-link`, name: tag, email: linkEmail, slug: `${tag}-link` },
    });
    try {
      const { id: availabilityId } = await prisma.availability.create({
        data: {
          userId: linkUserId,
          name: 'Horas laborables',
          timeZone: 'America/Argentina/Buenos_Aires',
          isDefault: true,
        },
      });
      const { id: serviceId } = await prisma.service.create({
        data: {
          userId: linkUserId,
          availabilityId,
          name: `${tag}-link`,
          slug: `${tag}-link`,
          category: 'CLINICA',
          durationMinutes: 60,
          price: 1,
        },
      });
      const created = await repository.create({
        serviceId,
        employeeId: null,
        userId: linkUserId,
        clientName: 'Dora',
        clientEmail: linkEmail,
        prepStartsAt: new Date(Date.UTC(2031, 0, 3, 16)),
        startsAt: new Date(Date.UTC(2031, 0, 3, 16)),
        endsAt: new Date(Date.UTC(2031, 0, 3, 17)),
        notes: null,
        status: BookingStatus.BOOKED,
      });

      const found = await repository.findByLink(created.link);

      expect(found.id).toBe(created.id);
      expect(found.user).toEqual({ slug: `${tag}-link` });
      await expect(repository.findByLink('a-link-nobody-has')).rejects.toThrow(
        new NotFoundError('Turno not found'),
      );

      // Dar de baja el Servicio personal le quita su Availability; el Turno sigue abriéndose por su Enlace.
      await prisma.service.update({
        where: { id: serviceId },
        data: { deletedAt: new Date(), availabilityId: null },
      });
      const afterRetire = await repository.findByLink(created.link);
      expect(afterRetire.timeZone).toBe('America/Argentina/Buenos_Aires');
    } finally {
      await prisma.booking.deleteMany({ where: { userId: linkUserId } });
      await prisma.service.deleteMany({ where: { userId: linkUserId } });
      await prisma.availability.deleteMany({ where: { userId: linkUserId } });
      await prisma.user.delete({ where: { id: linkUserId } });
    }
  }, 60_000);

  it('lists the Turnos the Usuario attends: personales and of Negocios where they are an active Empleado, not of one that dio de baja them (ADR 0023)', async () => {
    const mineEmail = `mine-${email}`;
    const { id: mineUserId } = await prisma.user.create({
      data: { clerkId: `${tag}-mine`, name: tag, email: mineEmail },
    });
    const { id: ownerId } = await prisma.user.create({
      data: { clerkId: `${tag}-mine-owner`, name: tag, email: `owner-${mineEmail}` },
    });
    const { id: businessId } = await prisma.business.create({
      data: { name: `${tag}-mine`, description: tag, ownerId, slug: `${tag}-mine` },
    });
    const { id: branchId } = await prisma.branch.create({
      data: {
        businessId,
        name: 'Uptown',
        address: '1 Main St',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'uptown',
      },
    });
    const { id: availabilityId } = await prisma.availability.create({
      data: {
        userId: mineUserId,
        name: 'Horas laborables',
        timeZone: 'America/Argentina/Buenos_Aires',
        isDefault: true,
      },
    });
    const bookAt = (hour: number, serviceId: number, employeeId: number | null) =>
      repository.create({
        serviceId,
        employeeId,
        userId: mineUserId,
        clientName: 'Eva',
        clientEmail: mineEmail,
        prepStartsAt: new Date(Date.UTC(2031, 0, 4, hour)),
        startsAt: new Date(Date.UTC(2031, 0, 4, hour)),
        endsAt: new Date(Date.UTC(2031, 0, 4, hour + 1)),
        notes: null,
        status: BookingStatus.BOOKED,
      });

    try {
      const personal = await prisma.service.create({
        data: {
          userId: mineUserId,
          availabilityId,
          name: `${tag}-personal`,
          slug: `${tag}-personal`,
          category: 'CLINICA',
          durationMinutes: 60,
          price: 1,
        },
      });
      const ofBusiness = await prisma.service.create({
        data: {
          branchId,
          name: `${tag}-business`,
          slug: `${tag}-business`,
          category: 'CLINICA',
          durationMinutes: 60,
          price: 1,
        },
      });
      const { id: activeId } = await prisma.employee.create({
        data: { userId: mineUserId, businessId },
      });
      const { id: retiredId } = await prisma.employee.create({
        data: { userId: mineUserId, businessId, deletedAt: new Date() },
      });
      await bookAt(10, personal.id, null);
      await bookAt(12, ofBusiness.id, activeId);
      await bookAt(14, ofBusiness.id, retiredId);

      const listed = await repository.listByUser(mineUserId);

      expect(listed.map((b) => [b.serviceName, b.business, b.branch])).toEqual([
        [`${tag}-personal`, null, null],
        [`${tag}-business`, { id: businessId, name: `${tag}-mine` }, { id: branchId, name: 'Uptown' }],
      ]);
    } finally {
      await prisma.booking.deleteMany({ where: { userId: mineUserId } });
      await prisma.service.deleteMany({ where: { OR: [{ userId: mineUserId }, { branchId }] } });
      await prisma.employee.deleteMany({ where: { businessId } });
      await prisma.availability.deleteMany({ where: { userId: mineUserId } });
      await prisma.branch.deleteMany({ where: { businessId } });
      await prisma.business.deleteMany({ where: { id: businessId } });
      await prisma.user.deleteMany({ where: { id: { in: [mineUserId, ownerId] } } });
    }
  }, 60_000);
});
