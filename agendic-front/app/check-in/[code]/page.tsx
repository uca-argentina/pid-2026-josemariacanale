export default async function Page({ params }: { params: Promise<{ bookingId: number }> }) {

  const { bookingId } = await params;


  const res = await fetch(`${process.env.API_URL}/bookings/checkin/${bookingId}`, { cache: 'no-store' });
  const checkin = await res.json();


  if (!res.ok) return <p className="p-8 text-red-600">{checkin.message}</p>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">BookingId {checkin.bookingId}</h1>
      <p>Hora de llegada: {checkin.arrivedAt}</p>
      <p>Estado: {checkin.status}</p>
    </div>
  );
}