import BookingsPage from '@/app/(app)/bookings/page';
import BookingPage from '@/app/(app)/bookings/[bookingId]/page';
import { UnauthenticatedError } from '@/src/entities/errors/auth';

const mockGetCurrentUser = jest.fn();
const mockList = jest.fn();
const mockReport = jest.fn();

jest.mock('@/app/(public)/(auth)/current-user', () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IListMyBookingsController' ? mockList : { report: mockReport }),
}));
jest.mock('@/app/(app)/bookings/_components/BookingsView', () => ({ BookingsView: () => null }));
jest.mock('@/app/(app)/bookings/[bookingId]/_components/BookingDetail', () => ({ BookingDetail: () => null }));
jest.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`REDIRECT:${path}`);
    },
    notFound: () => {
        throw new Error('NOT_FOUND');
    },
    unstable_rethrow: (error: Error) => {
        if (/^(REDIRECT|NOT_FOUND)/.test(error.message)) throw error;
    },
}));

const booking = { id: 7, status: 'BOOKED', clientName: 'Lucía' };

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ name: 'Martina' });
    mockList.mockResolvedValue([booking]);
});

describe('BookingsPage', () => {
    it('redirects to sign-in without Sesión', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(BookingsPage()).rejects.toThrow('REDIRECT:');
        expect(mockList).not.toHaveBeenCalled();
    });

    it('hands the Turnos of the controller to the view', async () => {
        const element = await BookingsPage();
        expect(element.props.bookings).toEqual([booking]);
    });

    it('redirects to sign-in when the Sesión expired', async () => {
        mockList.mockRejectedValue(new UnauthenticatedError('no'));
        await expect(BookingsPage()).rejects.toThrow('REDIRECT:');
    });

    it('reports any other failure and shows the aviso', async () => {
        mockList.mockRejectedValue(new Error('boom'));
        await BookingsPage();
        expect(mockReport).toHaveBeenCalled();
    });
});

describe('BookingPage', () => {
    const render = (bookingId: string) =>
        BookingPage({ params: Promise.resolve({ bookingId }), searchParams: Promise.resolve({}) });

    it('finds the Turno by id in the list', async () => {
        const element = await render('7');
        expect(element.props.booking).toEqual(booking);
    });

    it('is not found when the list has no such Turno', async () => {
        await expect(render('8')).rejects.toThrow('NOT_FOUND');
    });

    it('redirects to sign-in without Sesión', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(render('7')).rejects.toThrow('REDIRECT:');
    });
});
