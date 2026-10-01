import { ConfirmBookingButton } from './_components/ConfirmBookingButton';
import { invalidLink } from './messages';

/** Título de la pestaña. */
export const metadata = { title: 'Verificar email' };

/**
 * Destino del link del mail de verificación: pide al Cliente confirmar su Turno con el `token` de la URL.
 *
 * No verifica al renderizar: un escáner de links del mail consumiría el token. Sin token muestra el link inválido.
 * Es pública: el Cliente no tiene Sesión (ADR 0005).
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams;
    return (
        <main className="mx-auto flex max-w-[420px] flex-col items-center gap-2.5 px-7 py-15 text-center">
            {token ? (
                <ConfirmBookingButton token={token} />
            ) : (
                <>
                    <h1 className="text-[16px] font-extrabold tracking-[-0.02em]">{invalidLink.title}</h1>
                    <p className="text-[13px] font-medium text-muted-foreground">{invalidLink.text}</p>
                </>
            )}
        </main>
    );
}
