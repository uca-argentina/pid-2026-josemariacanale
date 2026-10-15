import { InvalidVerificationCodeError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { joinWaitlistController } from '@/src/interface-adapters/controllers/bookings/join-waitlist.controller';
import { instrumentation } from '@/tests/unit/stubs';

const input = {
    serviceId: 100,
    date: '2026-10-20',
    clientName: '  Juana Pérez ',
    clientEmail: ' juana@example.com ',
    code: ' ABC234 ',
};

describe('joinWaitlistController', () => {
    it('anota con los datos recortados del Cliente y presenta la Anotación', async () => {
        const useCase = jest.fn().mockResolvedValue({ serviceId: 100, date: '2026-10-20', extra: 'no sale' });

        await expect(joinWaitlistController(instrumentation, useCase)(input)).resolves.toEqual({
            serviceId: 100,
            date: '2026-10-20',
        });
        expect(useCase).toHaveBeenCalledWith({
            serviceId: 100,
            date: '2026-10-20',
            clientName: 'Juana Pérez',
            clientEmail: 'juana@example.com',
            code: 'ABC234',
        });
    });

    it.each([
        ['a missing serviceId', { ...input, serviceId: undefined }],
        ['a date that is not YYYY-MM-DD', { ...input, date: '20/10/2026' }],
        ['a blank clientName', { ...input, clientName: '   ' }],
        ['an invalid clientEmail', { ...input, clientEmail: 'juana' }],
        ['a missing code', { ...input, code: undefined }],
        ['a blank code', { ...input, code: '   ' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(joinWaitlistController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('lets an invalid code through as InvalidVerificationCodeError', async () => {
        const error = new InvalidVerificationCodeError('Invalid or expired verification code for juana@example.com');
        const useCase = jest.fn().mockRejectedValue(error);
        await expect(joinWaitlistController(instrumentation, useCase)(input)).rejects.toBe(error);
    });
});
