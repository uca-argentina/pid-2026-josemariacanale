'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { CODE_LENGTH, EMPTY_CODE, sanitizeCode, writeCode } from './code-input';

/**
 * Pide el Código de verificación que acaba de salir por mail y reserva sola al completarse la sexta casilla.
 *
 * `onSubmit` y `onRequestNewCode` devuelven el mensaje a mostrar cuando el pedido falla de forma recuperable, y
 * `null` cuando salió bien. Al Reservar no vuelve nada: qué pasa entonces (navegar al Turno, o volver al paso
 * Horario porque se ocupó) lo decide quien abrió el modal.
 */
export function CodeModal({
    email,
    onSubmit,
    onRequestNewCode,
    onClose,
}: {
    email: string;
    onSubmit: (code: string) => Promise<string | null>;
    onRequestNewCode: () => Promise<string | null>;
    onClose: () => void;
}) {
    const [chars, setChars] = useState<readonly string[]>(EMPTY_CODE);
    const [error, setError] = useState<string | null>(null);
    // Cada intento remonta las casillas, que es lo que le devuelve el foco a la primera con `autoFocus`: cuando
    // se vacían, siguen deshabilitadas hasta que React pinta, así que un `focus()` de acá no entraría.
    const [attempt, setAttempt] = useState(0);
    const [pending, startTransition] = useTransition();
    const boxes = useRef<(HTMLInputElement | null)[]>([]);

    // En el document, no en el div: con el foco en el fondo del modal, un onKeyDown de acá no se enteraría.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const restart = (message: string | null) => {
        setError(message);
        setChars(EMPTY_CODE);
        setAttempt((n) => n + 1);
    };

    const write = (index: number, raw: string) => {
        const { chars: next, focus } = writeCode(chars, index, raw);
        setChars(next);
        boxes.current[focus]?.focus();
        const code = next.join('');
        // Completa la sexta casilla: reserva sola, sin botón.
        if (code.length === CODE_LENGTH)
            startTransition(async () => {
                const message = await onSubmit(code);
                if (message) restart(message);
            });
    };

    const requestNewCode = () =>
        startTransition(async () => {
            // El código que llega deja al tipeado sin valor: las casillas arrancan de cero.
            restart(await onRequestNewCode());
        });

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="codigo-titulo"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4"
        >
            <div className="w-full max-w-[440px] rounded-2xl border border-border bg-background p-6 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                    <h2 id="codigo-titulo" className="text-[17px] leading-snug font-extrabold tracking-[-0.02em]">
                        Te mandamos un código a {email}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar" className="-mt-1 shrink-0 rounded-full">
                        <X className="size-4" />
                    </Button>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-1 text-[13.5px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                    Cambiar email
                </button>

                <div key={attempt} className="mt-5 flex justify-between gap-2" role="group" aria-label="Código de verificación">
                    {chars.map((char, index) => (
                        <input
                            key={index}
                            ref={(box) => {
                                boxes.current[index] = box;
                            }}
                            value={char}
                            disabled={pending}
                            // El navegador recorta un pegado a un carácter, así que lo atiende onPaste aparte.
                            maxLength={1}
                            inputMode="text"
                            aria-label={`Carácter ${index + 1} de ${CODE_LENGTH}`}
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            autoFocus={index === 0}
                            // Entrar a una casilla llena selecciona su carácter: el que se tipee lo reemplaza.
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(event) => write(index, event.target.value)}
                            onPaste={(event) => {
                                event.preventDefault();
                                write(0, sanitizeCode(event.clipboardData.getData('text')));
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Backspace' && !char && index > 0) boxes.current[index - 1]?.focus();
                            }}
                            className="h-14 w-full min-w-0 rounded-xl border border-input bg-transparent text-center text-[20px] font-extrabold uppercase transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                        />
                    ))}
                </div>

                {pending && (
                    <p role="status" className="mt-4 text-[13.5px] font-semibold text-muted-foreground">
                        Reservando…
                    </p>
                )}

                {error && (
                    <p role="alert" className="mt-4 rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={requestNewCode}
                    disabled={pending}
                    className="mt-5 text-[13.5px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                >
                    Pedir un código nuevo
                </button>
            </div>
        </div>
    );
}
