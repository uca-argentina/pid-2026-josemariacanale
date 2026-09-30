import { redirect, unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { BookingsView } from './_components/BookingsView';
import { readClock } from './_components/booking-helpers';

export const metadata = { title: 'Turnos' };

export default async function BookingsPage() {
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);

    const now = readClock();
    let bookings;
    try {
        bookings = await getInjection('IListMyBookingsController')();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    return <BookingsView bookings={bookings} now={now} />;
}
