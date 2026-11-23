'use client';

// PRECARIO A PROPÓSITO: la página pide la Anotación desde el cliente con una server action y muestra todo crudo.

import { use, useEffect, useState } from 'react';
import { aceptarOferta, salirDeLaLista, verAnotacion } from '../actions';

export default function Page({ params }: { params: Promise<{ link: string }> }) {
    const { link } = use(params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [anotacion, setAnotacion] = useState<any>(null);
    const [mensaje, setMensaje] = useState('');

    async function cargar() {
        const r = await verAnotacion(link);
        if (r.ok) setAnotacion(r.data);
        else setMensaje(r.message);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function onAceptar() {
        const r = await aceptarOferta(link);
        if (r.ok) window.location.href = `/turnos/${r.data.bookingLink}`;
        else {
            // Si venció, el back ya se la pasó al siguiente: recargamos para ver el estado nuevo.
            setMensaje(r.message.startsWith('Offer expired') ? 'La oferta venció.' : r.message);
            cargar();
        }
    }

    async function onSalir() {
        const r = await salirDeLaLista(link);
        setMensaje(r.ok ? 'Saliste de la lista de espera.' : r.message);
        cargar();
    }

    if (!anotacion) return <p className="p-8">{mensaje || 'Cargando…'}</p>;

    return (
        <div className="mx-auto max-w-md p-8">
            <h1 className="mb-4 text-2xl font-bold">Lista de espera</h1>
            <p>Servicio: {anotacion.service.name}</p>
            <p>Turno: {new Date(anotacion.startsAt).toLocaleString('es-AR', { timeZone: anotacion.timeZone })}</p>
            <p>Estado: {anotacion.status}</p>

            {anotacion.status === 'OFFERED' && (
                <>
                    <p className="mt-4 font-bold">
                        ¡Se liberó el turno! Tenés hasta las {new Date(anotacion.offerExpiresAt).toLocaleTimeString('es-AR')} para aceptarlo.
                    </p>
                    <button className="mt-2 bg-black px-4 py-2 text-white" onClick={onAceptar}>
                        Aceptar turno
                    </button>
                </>
            )}

            {anotacion.status === 'ACCEPTED' && anotacion.bookingLink && (
                <a className="mt-4 block underline" href={`/turnos/${anotacion.bookingLink}`}>
                    Ver mi turno (y pagar la seña si hace falta)
                </a>
            )}

            {(anotacion.status === 'WAITING' || anotacion.status === 'OFFERED') && (
                <button className="mt-4 block border px-4 py-2" onClick={onSalir}>
                    Salir de la lista
                </button>
            )}

            {mensaje && <p className="mt-4 font-bold">{mensaje}</p>}
        </div>
    );
}
