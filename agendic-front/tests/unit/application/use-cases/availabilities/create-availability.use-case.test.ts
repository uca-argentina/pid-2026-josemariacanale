import { createAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import { AvailabilityRuleError } from '@/src/entities/errors/availability';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const input = { name: 'Horario', timeZone: 'America/Argentina/Buenos_Aires' };

describe('createAvailabilityUseCase', () => {
    it('delegates to the repository', async () => {
        const createAvailability = jest.fn().mockResolvedValue(undefined);
        await createAvailabilityUseCase(instrumentation, availabilitiesWith({ createAvailability }))(input);
        expect(createAvailability).toHaveBeenCalledWith(input);
    });

    it('lets AvailabilityRuleError through', async () => {
        const createAvailability = jest.fn().mockRejectedValue(new AvailabilityRuleError('zona inválida'));
        await expect(createAvailabilityUseCase(instrumentation, availabilitiesWith({ createAvailability }))(input)).rejects.toBeInstanceOf(
            AvailabilityRuleError,
        );
    });
});
