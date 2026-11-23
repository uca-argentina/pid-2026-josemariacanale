'use client';

// PRECARIO A PROPÓSITO: todo en una página, estado con useState, sin componentes de ui/.
// Se entra con /lista-de-espera-turno?serviceId=3&startsAt=2026-12-01T13:00:00.000Z (los dos opcionales).

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { anotarse, pedirCodigo } from './actions';

function Formulario() {
    const params = useSearchParams();
    const [serviceId, setServiceId] = useState(params.get('serviceId') ?? '');
    const [startsAt, setStartsAt] = useState(params.get('startsAt') ?? '');
    const [employeeId, setEmployeeId] = useState(params.get('employeeId') ?? '');
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [codigo, setCodigo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [link, setLink] = useState('');

    async function onPedirCodigo() {
        const r = await pedirCodigo(email);
        setMensaje(r.ok ? 'Te mandamos el código (mirá la consola del back).' : r.message);
    }

    async function onAnotarse() {
        const r = await anotarse({
            serviceId: Number(serviceId),
            startsAt: new Date(startsAt).toISOString(),
            employeeId: employeeId ? Number(employeeId) : undefined,
            clientName: nombre,
            clientEmail: email,
            code: codigo,
        });
        if (r.ok) {
            setLink(r.data.link);
            setMensaje('¡Quedaste anotado!');
        } else setMensaje(r.message);
    }

    const input = 'block w-full border p-2 mb-3';

    return (
        <div className="mx-auto max-w-md p-8">
            <h1 className="mb-4 text-2xl font-bold">Lista de espera de un turno</h1>

            <label>ID del servicio</label>
            <input className={input} value={serviceId} onChange={(e) => setServiceId(e.target.value)} />

            <label>Fecha y hora del turno (ISO, ej. 2026-12-01T13:00:00.000Z)</label>
            <input className={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />

            <label>ID del empleado (opcional)</label>
            <input className={input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />

            <label>Nombre</label>
            <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} />

            <label>Email</label>
            <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="mb-3 border px-3 py-1" onClick={onPedirCodigo}>
                Pedir código
            </button>

            <label>Código</label>
            <input className={input} value={codigo} onChange={(e) => setCodigo(e.target.value)} />

            <button className="bg-black px-4 py-2 text-white" onClick={onAnotarse}>
                Anotarme
            </button>

            {mensaje && <p className="mt-4 font-bold">{mensaje}</p>}
            {link && (
                <p className="mt-2">
                    Tu enlace:{' '}
                    <a className="underline" href={`/lista-de-espera-turno/${link}`}>
                        /lista-de-espera-turno/{link}
                    </a>
                </p>
            )}
        </div>
    );
}

export default function Page() {
    return (
        <Suspense>
            <Formulario />
        </Suspense>
    );
}
