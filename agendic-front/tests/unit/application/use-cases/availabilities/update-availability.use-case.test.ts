import { updateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { LeftOutsideBookingsChangedError } from '@/src/entities/errors/out-of-office';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const input = { availabilityId: 7, name: 'Horario', timeZone: 'UTC', schedule: [[], [], [], [], [], [], []], overrides: [] };

describe('updateAvailabilityUseCase', () => {
    it('delegates to the repository with the confirmed Turnos and returns how many were cancelled', async () => {
        const updateAvailability = jest.fn().mockResolvedValue({ cancelledBookings: 2 });
        const confirmed = { ...input, cancelBookingIds: [4, 5] };
        await expect(updateAvailabilityUseCase(instrumentation, availabilitiesWith({ updateAvailability }))(confirmed)).resolves.toEqual({
            cancelledBookings: 2,
        });
        expect(updateAvailability).toHaveBeenCalledWith(confirmed);
    });

    it('lets NotFoundError through', async () => {
        const updateAvailability = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(updateAvailabilityUseCase(instrumentation, availabilitiesWith({ updateAvailability }))(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lets LeftOutsideBookingsChangedError through', async () => {
        const updateAvailability = jest.fn().mockRejectedValue(new LeftOutsideBookingsChangedError('cambiaron'));
        await expect(updateAvailabilityUseCase(instrumentation, availabilitiesWith({ updateAvailability }))(input)).rejects.toBeInstanceOf(
            LeftOutsideBookingsChangedError,
        );
    });
});
