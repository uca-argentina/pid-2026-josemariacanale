import { notFound } from 'next/navigation';
import { loadBooking } from '@/app/(app)/_components/mock-bookings';
import { BookingDetail } from './_components/BookingDetail';

export default async function BookingPage({
    params,
    searchParams,
}: {
    params: Promise<{ bookingId: string }>;
    searchParams: Promise<{ cancelar?: string }>;
}) {
    const [{ bookingId }, { cancelar }] = await Promise.all([params, searchParams]);
    const { now, booking } = loadBooking(bookingId);
    if (!booking) notFound();

    return <BookingDetail booking={booking} now={now} startCancelling={cancelar !== undefined} />;
}
