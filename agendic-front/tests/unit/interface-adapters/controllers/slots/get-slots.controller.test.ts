import { getSlotsController } from '@/src/interface-adapters/controllers/slots/get-slots.controller';
import { InputParseError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';
import type { ServiceSlots } from '@/src/entities/models/slot';

const mockSlots: ServiceSlots = {
    timeZone: 'America/Argentina/Buenos_Aires',
    days: [
        { date: '2026-10-05', slots: ['2026-10-05T12:00:00.000Z'] },
        { date: '2026-10-06', slots: [], reason: 'NOT_WORKING' },
    ],
};

const validInput = {
    serviceId: 1,
    employeeId: 2,
    from: '2026-10-05',
    to: '2026-10-06',
};

describe('getSlotsController', () => {
    it('validates input and returns presented slots', async () => {
        const useCase = jest.fn().mockResolvedValue(mockSlots);
        const controller = getSlotsController(instrumentation, useCase);

        const result = await controller(validInput);

        expect(useCase).toHaveBeenCalledWith(validInput);
        expect(result).toEqual({
            timeZone: 'America/Argentina/Buenos_Aires',
            days: [
                {
                    date: '2026-10-05',
                    slots: ['2026-10-05T12:00:00.000Z'],
                    reason: undefined,
                    coveredByEmployeeId: undefined,
                },
                {
                    date: '2026-10-06',
                    slots: [],
                    reason: 'NOT_WORKING',
                    coveredByEmployeeId: undefined,
                },
            ],
        });
    });

    it.each([
        ['missing serviceId', { ...validInput, serviceId: undefined }],
        ['invalid serviceId type', { ...validInput, serviceId: 'not-a-number' }],
        ['missing employeeId', { ...validInput, employeeId: undefined }],
        ['invalid from format', { ...validInput, from: '05-10-2026' }],
        ['invalid to format', { ...validInput, to: 'invalid' }],
        ['empty input', {}],
    ])('throws InputParseError on %s and does not call use case', async (_, invalidInput) => {
        const useCase = jest.fn();
        const controller = getSlotsController(instrumentation, useCase);

        await expect(controller(invalidInput)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
