import { notFound, redirect, unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/app/(public)/(auth)/current-user';
import { isSessionExpired } from '@/app/api-error';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { loadMyBookings } from '@/app/(app)/bookings/load-my-bookings';
import { readClock } from '@/app/(app)/bookings/_components/booking-helpers';
import { BookingDetail } from './_components/BookingDetail';

export default async function BookingPage({
    params,
    searchParams,
}: {
    params: Promise<{ bookingId: string }>;
    searchParams: Promise<{ cancelar?: string }>;
}) {
    const [{ bookingId }, { cancelar }] = await Promise.all([params, searchParams]);
    const user = await getCurrentUser();
    if (!user) redirect(SIGN_IN_PATH);

    const now = readClock();
    let bookings;
    try {
        bookings = await loadMyBookings();
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return <BackendErrorNotice />;
    }

    const booking = bookings.find((b) => String(b.id) === bookingId);
    if (!booking) notFound();

    return <BookingDetail booking={booking} now={now} startCancelling={cancelar !== undefined} />;
}
