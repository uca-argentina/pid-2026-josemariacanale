import { BookingsView } from './_components/BookingsView';
import { loadBookings } from '../_components/mock-bookings';

export default function BookingsPage() {
    const { now, bookings } = loadBookings();
    return <BookingsView initialBookings={bookings} now={now} />;
}
