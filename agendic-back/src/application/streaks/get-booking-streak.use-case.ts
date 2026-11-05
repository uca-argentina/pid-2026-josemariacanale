import { Inject, Injectable } from '@nestjs/common';
import { assertAssignedAttendant } from '../bookings/assert-assigned-attendant';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  currentStreak,
  NextReward,
  nextReward,
} from '../../domain/streaks/streak';
import { StreakPrize } from '../../domain/streaks/streak-prize';
import { StreakReward } from '../../domain/streaks/streak-program';
import {
  STREAK_PRIZES_REPOSITORY,
  StreakPrizesRepository,
} from '../../domain/streaks/streak-prizes.repository';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';

/** The Racha of the Cliente of a Turno, what is left to the next Recompensa and the Premios they can still be given. */
export interface BookingStreak {
  /** Null when the program is off or has no Recompensas; `burnsAt` is null when the Cliente has no Racha in course. */
  streak: { count: number; burnsAt: Date | null } | null;
  nextReward: NextReward<StreakReward> | null;
  /** Available ones, the oldest first, even with the program off: they were already promised. */
  prizes: StreakPrize[];
}

/** Arma la Racha, la próxima Recompensa y los Premios disponibles de la Ficha del Cliente de un Turno. */
@Injectable()
export class GetBookingStreakUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(STREAK_PROGRAMS_REPOSITORY)
    private readonly programs: StreakProgramsRepository,
    @Inject(STREAK_PRIZES_REPOSITORY)
    private readonly prizes: StreakPrizesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe
   * @throws {ForbiddenError} el Usuario no es el Empleado asignado al Turno
   * @throws {DatabaseOperationError} falló la base
   */
  async execute(userId: number, bookingId: number): Promise<BookingStreak> {
    const booking = await this.bookings.findById(bookingId);
    await assertAssignedAttendant(
      this.employees,
      booking,
      userId,
      'Only the assigned Employee can act on this Turno',
    );
    const now = this.clock.now();
    const owner = await this.prizes.findOwnerByBookingId(bookingId);
    const email = booking.clientEmail.toLowerCase();
    const [prizes, program] = await Promise.all([
      this.prizes.listAvailable(owner, email, now),
      this.programs.findByOwnerIncludeRewards(owner),
    ]);
    if (
      !program?.active ||
      program.burnAfterDays === null ||
      program.rewards.length === 0
    )
      return { streak: null, nextReward: null, prizes };

    const streak = currentStreak(
      await this.prizes.listClientFileBookings(owner, [email]),
      program.burnAfterDays,
      now,
    );
    const count = streak?.count ?? 0;
    return {
      streak: { count, burnsAt: streak?.burnsAt ?? null },
      nextReward: nextReward(program.rewards, count),
      prizes,
    };
  }
}
