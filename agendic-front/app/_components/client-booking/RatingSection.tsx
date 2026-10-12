'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Textarea } from '@/app/_components/ui/textarea';
import { ratingSection } from './client-booking-helpers';
import type { ClientBooking, ClientBookingActionResult } from './types';

const MAX_COMMENT = 500;

/**
 * Calificación del Turno: el formulario "¿Cómo te fue?" si el Cliente todavía puede calificar, o la suya en solo lectura si ya
 * calificó. No muestra nada en otro caso. Quien lo usa pasa la acción en `rate`.
 */
export function RatingSection({
    booking,
    rate,
    onUpdated,
    onNotice,
}: {
    booking: ClientBooking;
    rate: (score: number, comment?: string) => Promise<ClientBookingActionResult>;
    onUpdated: (booking: ClientBooking) => void;
    onNotice: (message: string) => void;
}) {
    const section = ratingSection(booking);
    if (section === 'form') return <RatingForm rate={rate} onUpdated={onUpdated} onNotice={onNotice} />;
    if (section === 'readonly' && booking.rating) {
        return (
            <div className="mt-7 border-t border-border pt-6">
                <h4 className="text-[17px] font-extrabold tracking-[-0.02em]">Tu calificación</h4>
                <Stars score={booking.rating.score} />
                {booking.rating.comment && (
                    <p className="mt-2 max-w-[62ch] rounded-xl bg-muted p-4 text-[13.5px] leading-relaxed">{booking.rating.comment}</p>
                )}
            </div>
        );
    }
    return null;
}

function Stars({ score }: { score: number }) {
    return (
        <div role="img" aria-label={`${score} de 5 estrellas`} className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`size-5 ${n <= score ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
            ))}
        </div>
    );
}

function RatingForm({
    rate,
    onUpdated,
    onNotice,
}: {
    rate: (score: number, comment?: string) => Promise<ClientBookingActionResult>;
    onUpdated: (booking: ClientBooking) => void;
    onNotice: (message: string) => void;
}) {
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const submit = () =>
        startTransition(async () => {
            const result = await rate(score, comment);
            if (result.ok) {
                onUpdated(result.booking);
                return onNotice('¡Gracias por tu calificación!');
            }
            // El 409 trae el Turno recargado: la Calificación que ya tenía pasa a verse en solo lectura.
            if (result.booking) {
                onUpdated(result.booking);
                return onNotice(result.message);
            }
            setError(result.message);
        });

    return (
        <div className="mt-7 border-t border-border pt-6">
            <h4 className="text-[17px] font-extrabold tracking-[-0.02em]">¿Cómo te fue?</h4>
            {/* Radios nativos: las flechas del teclado mueven la selección sin código extra. */}
            <fieldset className="mt-3 flex gap-1" disabled={pending}>
                <legend className="sr-only">Calificación de 1 a 5 estrellas</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer rounded-md has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                        <input type="radio" name="score" value={n} checked={score === n} onChange={() => setScore(n)} className="sr-only" />
                        <span className="sr-only">{n === 1 ? '1 estrella' : `${n} estrellas`}</span>
                        <Star className={`size-7 ${n <= score ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} aria-hidden />
                    </label>
                ))}
            </fieldset>
            <Textarea
                aria-label="Comentario (opcional)"
                placeholder="Contanos más (opcional)"
                maxLength={MAX_COMMENT}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={pending}
                className="mt-3"
            />
            <p className="mt-1 text-right text-[12px] text-muted-foreground">
                {comment.length}/{MAX_COMMENT}
            </p>
            {error && (
                <p role="alert" className="mt-2 text-[13px] text-muted-foreground">
                    {error}
                </p>
            )}
            <Button onClick={submit} disabled={score === 0 || pending} className="mt-3 bg-foreground text-white hover:bg-foreground/90">
                {pending ? 'Enviando…' : 'Enviar'}
            </Button>
        </div>
    );
}
