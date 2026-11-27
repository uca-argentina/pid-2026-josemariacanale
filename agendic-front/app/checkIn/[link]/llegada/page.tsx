import { redirect } from 'next/navigation';

export default async function CheckInPage({
    params,
    searchParams,
}: {
    params: Promise<{ link: string }>;
    searchParams: Promise<{ error?: string }>;
}) {
    const { link } = await params;
    const { error } = await searchParams;

    const res = await fetch(`${process.env.API_URL}/checkIn/${link}`, { cache: 'no-store' });
    const data = await res.json();

    async function registrarLlegada(formData: FormData) {
        'use server';
        const res = await fetch(`${process.env.API_URL}/checkIn/${link}/llegada`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arrivalTime: formData.get('arrivalTime') }),
        });
        const json = await res.json();
        if (!res.ok) redirect(`/checkIn/${link}/llegada?error=${encodeURIComponent(json.message)}`);
        redirect(`/checkIn/${link}/llegada`);
    }

    return (
        <div className="flex flex-col gap-3 p-8">
            <h1 className="text-2xl font-bold">Registrar hora de llegada del cliente</h1>
            <p>Hora de llegada del cliente</p>
            {error && <p className="text-red-600">{error}</p>}
            {data.checkIn ? (
                <div>
                    <p>Tu turno: {data.checkIn.bookingId}</p>
                    <p>Estado: {data.checkIn.status}</p>
                </div>
            ) : (
                <form action={registrarLlegada} className="flex flex-col gap-2">
                    <button type="submit" className="bg-black px-3 py-1 text-white">Enviar registro</button>
                </form>
            )}
        </div>
    );
}