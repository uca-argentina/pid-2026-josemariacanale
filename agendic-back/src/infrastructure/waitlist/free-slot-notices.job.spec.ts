import { SendFreeSlotNoticesUseCase } from '../../application/waitlist/send-free-slot-notices.use-case';
import { FreeSlotNoticesJob } from './free-slot-notices.job';

describe('FreeSlotNoticesJob', () => {
  it('runs one pass of the use case', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);

    await new FreeSlotNoticesJob({ execute } as unknown as SendFreeSlotNoticesUseCase).run();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
