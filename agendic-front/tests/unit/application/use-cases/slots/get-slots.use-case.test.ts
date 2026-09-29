import { getSlotsUseCase } from '@/src/application/use-cases/slots/get-slots.use-case';
import { instrumentation } from '@/tests/unit/stubs';
import type { ISlotsRepository } from '@/src/application/repositories/slots.repository.interface';
import type { ServiceSlots } from '@/src/entities/models/slot';

const mockSlots: ServiceSlots = {
    timeZone: 'America/Argentina/Buenos_Aires',
    days: [
        { date: '2026-10-05', slots: ['2026-10-05T12:00:00.000Z'] },
        { date: '2026-10-06', slots: [], reason: 'NOT_WORKING' },
    ],
};

describe('getSlotsUseCase', () => {
    it('calls repository with correct arguments and returns slots', async () => {
        const slotsRepository: ISlotsRepository = {
            getSlots: jest.fn().mockResolvedValue(mockSlots),
        };

        const useCase = getSlotsUseCase(instrumentation, slotsRepository);
        const input = {
            serviceId: 1,
            employeeId: 2,
            from: '2026-10-05',
            to: '2026-10-06',
        };

        const result = await useCase(input);

        expect(result).toEqual(mockSlots);
        expect(slotsRepository.getSlots).toHaveBeenCalledWith(1, 2, '2026-10-05', '2026-10-06');
    });
});
