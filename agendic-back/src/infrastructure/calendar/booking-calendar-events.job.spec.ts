import { ReconcileBookingCalendarEventsUseCase } from '../../application/calendar/reconcile-booking-calendar-events.use-case';
import { BookingCalendarEventsJob } from './booking-calendar-events.job';

const jobOver = (execute: () => Promise<void>) =>
  new BookingCalendarEventsJob({
    execute,
  } as unknown as ReconcileBookingCalendarEventsUseCase);

describe('BookingCalendarEventsJob', () => {
  it('runs one pass of the use case', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);

    await jobOver(execute).run();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not start a pass while the previous one is still running', async () => {
    let finish!: () => void;
    const execute = jest.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const job = jobOver(execute);

    const first = job.run();
    await job.run();
    finish();
    await first;

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
