'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { CODE_LENGTH, EMPTY_CODE, sanitizeCode, writeCode } from './code-input';

/**
 * Pide el Código de verificación que acaba de salir por mail y reserva sola al completarse la sexta casilla.
 *
 * `onSubmit` y `onRequestNewCode` devuelven el mensaje a mostrar cuando el pedido falla de forma recuperable, y
 * `null` cuando no hay nada que mostrar acá: qué pasa al Reservar (navegar al Turno, o volver al paso Horario
 * porque se ocupó) lo decide quien abrió el modal.
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
    // Qué pedido está en vuelo, no solo si hay uno: las dos cosas deshabilitan las casillas, pero solo Reservar
    // muestra "Reservando…".
    const [running, setRunning] = useState<'book' | 'code' | null>(null);
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

    const run = async (what: 'book' | 'code', action: () => Promise<string | null>) => {
        setRunning(what);
        const message = await action();
        setRunning(null);
        // Reservar solo arranca de cero cuando falla; el código nuevo, siempre, porque el tipeado ya no sirve.
        if (what === 'code' || message) restart(message);
    };

    const write = (index: number, raw: string) => {
        const { chars: next, focus } = writeCode(chars, index, raw);
        setChars(next);
        boxes.current[focus]?.focus();
        const code = next.join('');
        if (code.length === CODE_LENGTH) void run('book', () => onSubmit(code));
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="codigo-titulo"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4"
        >
            <div className="w-full max-w-[440px] rounded-2xl border border-border bg-background p-6 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                    <h2 id="codigo-titulo" className="text-[17px] leading-snug font-bold tracking-[-0.02em]">
                        Te mandamos un código a <strong className="font-extrabold">{email}</strong>
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
                            disabled={running !== null}
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
                            // Borrar va acá y no por onChange: un value vacío no tiene ningún carácter que escribir,
                            // así que writeCode lo descartaría y la casilla no se vaciaría nunca.
                            onKeyDown={(event) => {
                                if (event.key !== 'Backspace') return;
                                event.preventDefault();
                                if (char) setChars(chars.map((c, i) => (i === index ? '' : c)));
                                else boxes.current[index - 1]?.focus();
                            }}
                            className="h-14 w-full min-w-0 rounded-xl border border-input bg-transparent text-center text-[20px] font-extrabold uppercase transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                        />
                    ))}
                </div>

                {running === 'book' && (
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
                    onClick={() => void run('code', onRequestNewCode)}
                    disabled={running !== null}
                    className="mt-5 text-[13.5px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                >
                    Pedir un código nuevo
                </button>
            </div>
        </div>
    );
}
