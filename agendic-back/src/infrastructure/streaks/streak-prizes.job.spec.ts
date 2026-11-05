import { GrantStreakPrizesUseCase } from '../../application/streaks/grant-streak-prizes.use-case';
import { StreakPrizesJob } from './streak-prizes.job';

describe('StreakPrizesJob', () => {
  it('runs one pass of the use case', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);

    await new StreakPrizesJob({ execute } as unknown as GrantStreakPrizesUseCase).run();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
