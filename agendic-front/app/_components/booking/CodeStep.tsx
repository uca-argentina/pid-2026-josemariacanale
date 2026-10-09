'use client';

import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import { CODE_LENGTH, EMPTY_CODE, sanitizeCode, writeCode } from './code-input';

/**
 * El final de Reservar, dentro del mismo flujo: pide el Código de verificación que acaba de salir por mail y
 * reserva solo al completarse la sexta casilla.
 *
 * `onSubmit` y `onRequestNewCode` devuelven el mensaje a mostrar cuando el pedido falla de forma recuperable, y
 * `null` cuando no hay nada que mostrar acá: qué pasa al Reservar (navegar al Turno, o volver al paso Horario
 * porque se ocupó) lo decide quien lo muestra.
 */
export function CodeStep({
    email,
    booked,
    onSubmit,
    onRequestNewCode,
    onChangeEmail,
}: {
    email: string;
    /** El Turno ya existe: muestra "¡Listo!" mientras quien lo muestra navega al Turno. */
    booked: boolean;
    onSubmit: (code: string) => Promise<string | null>;
    onRequestNewCode: () => Promise<string | null>;
    /** Vuelve al formulario con los datos cargados. */
    onChangeEmail: () => void;
}) {
    const [chars, setChars] = useState<readonly string[]>(EMPTY_CODE);
    const [error, setError] = useState<string | null>(null);
    // El código no sirvió: las casillas, ya vacías, quedan en rojo hasta que se tipee de nuevo.
    const [invalid, setInvalid] = useState(false);
    // Cada intento remonta las casillas, que es lo que le devuelve el foco a la primera con `autoFocus` y vuelve a
    // sacudirlas: cuando se vacían, siguen deshabilitadas hasta que React pinta, así que un `focus()` de acá no entraría.
    const [attempt, setAttempt] = useState(0);
    // Qué pedido está en vuelo, no solo si hay uno: los dos bloquean las casillas, pero solo Reservar las hace brillar.
    const [running, setRunning] = useState<'book' | 'code' | null>(null);
    const boxes = useRef<(HTMLInputElement | null)[]>([]);

    const run = async (what: 'book' | 'code', action: () => Promise<string | null>) => {
        setRunning(what);
        const message = await action();
        setRunning(null);
        setInvalid(what === 'book' && message !== null);
        // Reservar solo arranca de cero cuando falla; el código nuevo, siempre, porque el tipeado ya no sirve.
        if (what === 'code' || message) {
            setError(message);
            setChars(EMPTY_CODE);
            setAttempt((n) => n + 1);
        }
    };

    const write = (index: number, raw: string) => {
        const { chars: next, focus } = writeCode(chars, index, raw);
        setChars(next);
        setInvalid(false);
        boxes.current[focus]?.focus();
        const code = next.join('');
        if (code.length === CODE_LENGTH) void run('book', () => onSubmit(code));
    };

    return (
        <div className="flex max-w-[440px] flex-col">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
                Te mandamos un código a <strong className="font-bold text-foreground">{email}</strong>.
            </p>

            {booked ? (
                <div role="status" className="mt-8 flex flex-col items-center gap-3 motion-safe:animate-code-done">
                    <span className="flex size-14 items-center justify-center rounded-full bg-foreground text-white">
                        <Check className="size-7" />
                    </span>
                    <span className="text-[17px] font-extrabold tracking-[-0.02em]">¡Listo!</span>
                </div>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={onChangeEmail}
                        disabled={running !== null}
                        className="mt-1 self-start text-[13.5px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                    >
                        Cambiar email
                    </button>

                    <div
                        key={attempt}
                        className={cn('mt-6 flex justify-between gap-2', invalid && 'motion-safe:animate-code-shake')}
                        role="group"
                        aria-label="Código de verificación"
                    >
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
                                aria-invalid={invalid || undefined}
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
                                // El brillo arranca un poco más tarde en cada casilla: recorre el código de izquierda a derecha.
                                style={running === 'book' ? { animationDelay: `${index * 90}ms` } : undefined}
                                className={cn(
                                    'h-14 w-full min-w-0 rounded-xl border bg-transparent text-center text-[20px] font-extrabold uppercase transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                                    invalid ? 'border-destructive' : char ? 'border-foreground' : 'border-input',
                                    running === 'book'
                                        ? 'bg-muted motion-safe:code-shimmer'
                                        : char && 'motion-safe:animate-code-pop',
                                )}
                            />
                        ))}
                    </div>

                    {running === 'book' && (
                        <p role="status" className="sr-only">
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
                        className="mt-5 self-start text-[13.5px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                    >
                        Pedir un código nuevo
                    </button>
                </>
            )}
        </div>
    );
}
