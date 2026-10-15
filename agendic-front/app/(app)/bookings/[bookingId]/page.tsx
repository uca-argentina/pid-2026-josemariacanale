import { redirect } from 'next/navigation';

/** La página de detalle pasó a ser el panel lateral de Mis turnos: un link viejo abre la lista con ese Turno. */
export default async function BookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = await params;
    redirect(`/bookings?turno=${encodeURIComponent(bookingId)}`);
}
