'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { CodeStep } from './CodeStep';
import { joinWaitlistAction, requestVerificationCodeAction } from './actions';
import { formatDate } from './format';
import type { ClientData, Service } from './types';

type Phase = 'form' | 'code' | 'joined';

const TITLES: Record<Phase, string> = {
    form: 'Anotate en la Lista de espera',
    code: 'Verificá tu email',
    joined: '¡Quedaste anotado!',
};

/**
 * Anotarse en la Lista de espera de un Servicio para un día lleno: nombre y email, el Código de verificación en las
 * seis casillas de siempre y la pantalla de "quedaste anotado". Reemplaza a los pasos de Reservar mientras dura.
 *
 * `onDayChanged` se llama cuando el back dice que el día ya no está lleno (o ya pasó): quien lo monta vuelve a los
 * horarios, que se piden de nuevo, y muestra el mensaje.
 */
export function WaitlistFlow({
    service,
    date,
    onDayChanged,
    onClose,
}: {
    service: Service;
    date: string;
    onDayChanged: (message: string) => void;
    onClose: () => void;
}) {
    const [phase, setPhase] = useState<Phase>('form');
    const [client, setClient] = useState<Pick<ClientData, 'name' | 'email'>>({ name: '', email: '' });
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const requestCode = (data: Pick<ClientData, 'name' | 'email'>) => {
        setClient(data);
        setError(null);
        startTransition(async () => {
            const result = await requestVerificationCodeAction(data.email);
            if (result.ok) startTransition(() => setPhase('code'));
            else setError(result.message);
        });
    };

    /** @returns el mensaje a mostrar bajo las casillas si el código no sirvió; `null` si se anotó o si se cerró el paso. */
    const join = async (code: string): Promise<string | null> => {
        const result = await joinWaitlistAction({
            serviceId: service.id,
            date,
            clientName: client.name,
            clientEmail: client.email,
            code,
        }).catch(() => ({ ok: false as const, invalidCode: false, dayChanged: false, message: 'No pudimos anotarte. Intentá de nuevo.' }));
        if (result.ok) {
            startTransition(() => setPhase('joined'));
            return null;
        }
        if (result.invalidCode) return result.message;
        if (result.dayChanged) {
            onDayChanged(result.message);
            return null;
        }
        startTransition(() => {
            setError(result.message);
            setPhase('form');
        });
        return null;
    };

    const requestNewCode = async () => {
        const result = await requestVerificationCodeAction(client.email);
        return result.ok ? null : result.message;
    };

    return (
        <div>
            <h1 className="mt-4 mb-6 text-[34px] leading-none font-extrabold tracking-[-0.03em] sm:text-[44px]">{TITLES[phase]}</h1>

            {phase === 'form' && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        requestCode({ name: String(data.get('nombre')).trim(), email: String(data.get('email')).trim() });
                    }}
                    className="flex max-w-[560px] flex-col gap-4"
                >
                    <p className="text-[15px] leading-relaxed text-muted-foreground">
                        {service.name}, el <span className="first-letter:uppercase">{formatDate(date)}</span>. Si se libera un horario, te
                        mandamos un mail. El horario no queda reservado para vos: es para el primero que lo reserve.
                    </p>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="waitlist-nombre" className="text-[13.5px] font-bold">
                            Nombre y apellido
                        </Label>
                        <Input
                            id="waitlist-nombre"
                            name="nombre"
                            required
                            autoComplete="name"
                            placeholder="Tu nombre completo"
                            defaultValue={client.name}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="waitlist-email" className="text-[13.5px] font-bold">
                            Email
                        </Label>
                        <Input
                            id="waitlist-email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="tunombre@email.com"
                            defaultValue={client.email}
                        />
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                            Te vamos a mandar un código para que verifiques tu email.
                        </p>
                    </div>

                    {error && (
                        <p role="alert" className="rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={pending}
                        className="h-auto w-full rounded-xl bg-foreground py-3.5 text-[15px] font-bold text-white hover:bg-foreground/90 sm:w-fit sm:px-8"
                    >
                        {pending ? 'Enviando…' : 'Anotarme'}
                    </Button>
                </form>
            )}

            {phase === 'code' && (
                <CodeStep
                    email={client.email}
                    booked={false}
                    onSubmit={join}
                    onRequestNewCode={requestNewCode}
                    onChangeEmail={() => startTransition(() => setPhase('form'))}
                />
            )}

            {phase === 'joined' && (
                <div role="status" className="flex max-w-[480px] flex-col items-start gap-4">
                    <span className="flex size-14 items-center justify-center rounded-full bg-foreground text-white">
                        <Check className="size-7" />
                    </span>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">
                        Quedaste anotado en la Lista de espera de <strong className="text-foreground">{service.name}</strong> para el{' '}
                        <strong className="text-foreground">{formatDate(date)}</strong>. Te va a llegar un mail a{' '}
                        <strong className="text-foreground">{client.email}</strong> con el enlace para salir de la Lista de espera.
                    </p>
                    <Button variant="outline" onClick={onClose} className="h-auto rounded-full px-4 py-2.5 text-[13.5px] font-bold">
                        Cerrar
                    </Button>
                </div>
            )}
        </div>
    );
}
