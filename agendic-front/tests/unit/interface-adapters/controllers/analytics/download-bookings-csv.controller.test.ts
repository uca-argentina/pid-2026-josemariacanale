import { downloadBookingsCsvController } from '@/src/interface-adapters/controllers/analytics/download-bookings-csv.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const input = { from: '2026-09-13', to: '2026-10-12', serviceId: 7 };

describe('downloadBookingsCsvController', () => {
    it('passes the file and names it after the range', async () => {
        const download = jest.fn().mockResolvedValue('id,estado\n1,BOOKED\n');

        const result = await downloadBookingsCsvController(instrumentation, signedIn, download)(input);

        expect(download).toHaveBeenCalledWith(input);
        expect(result).toEqual({ filename: 'turnos-2026-09-13-2026-10-12.csv', content: 'id,estado\n1,BOOKED\n' });
    });

    it.each([
        ['a bad range', { ...input, from: 'x' }],
        ['a bad filter', { ...input, businessId: 4, branchId: 0 }],
    ])('rejects %s without calling the use case', async (_name, bad) => {
        const download = jest.fn();
        await expect(downloadBookingsCsvController(instrumentation, signedIn, download)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(download).not.toHaveBeenCalled();
    });

    it('requires a Sesión', async () => {
        const download = jest.fn();
        const noSession = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(downloadBookingsCsvController(instrumentation, noSession, download)(input)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(download).not.toHaveBeenCalled();
    });
});
