import { verifyBookingAction } from '@/app/(public)/verify-email/actions';
import { invalidLink } from '@/app/(public)/verify-email/messages';
import { BookingStateError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';

const mockVerify = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IVerifyBookingController' ? mockVerify : { report: mockReport }),
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('verifyBookingAction', () => {
    it('tells a PENDING Turno it waits for the Negocio', async () => {
        mockVerify.mockResolvedValue({ status: 'PENDING' });
        const result = await verifyBookingAction('abc');
        expect(mockVerify).toHaveBeenCalledWith({ token: 'abc' });
        expect(result.text).toMatch(/pendiente/);
    });

    it('tells a BOOKED Turno it is reserved', async () => {
        mockVerify.mockResolvedValue({ status: 'BOOKED' });
        expect((await verifyBookingAction('abc')).text).toMatch(/reservado/);
    });

    it('tells the Cliente the horario was taken, without reporting', async () => {
        mockVerify.mockRejectedValue(new SlotTakenError('taken'));
        expect((await verifyBookingAction('abc')).title).toBe('Ese horario se ocupó');
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('tells the Cliente the horario is no longer available, without reporting', async () => {
        mockVerify.mockRejectedValue(new SlotUnavailableError('Slot x is not available for Service 1'));
        expect((await verifyBookingAction('abc')).title).toBe('Ese horario ya no está disponible');
        expect(mockReport).not.toHaveBeenCalled();
    });

    it.each([new BookingStateError('x'), new NotFoundError('x'), new InputParseError('x')])(
        'shows the invalid link for %s, without reporting',
        async (error) => {
            mockVerify.mockRejectedValue(error);
            await expect(verifyBookingAction('abc')).resolves.toEqual(invalidLink);
            expect(mockReport).not.toHaveBeenCalled();
        },
    );

    it('reports anything else and shows a generic message', async () => {
        const error = new ApiRequestError('boom');
        mockVerify.mockRejectedValue(error);
        expect((await verifyBookingAction('abc')).title).toBe('No pudimos verificar tu email');
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});
