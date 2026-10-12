import { SendRatingRequestsUseCase } from '../../../application/bookings/send-rating-requests.use-case';
import { RatingRequestsJob } from '../rating-requests.job';

describe('RatingRequestsJob', () => {
  it('runs one pass of the use case', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);

    await new RatingRequestsJob({ execute } as unknown as SendRatingRequestsUseCase).run();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
