import Link from 'next/link';
import { Header } from '@/app/_components/Header';
import { Footer } from '@/app/_components/Footer';
import { Button } from '@/app/_components/ui/button';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col">
            <Header user={null} nav={false} />
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
                <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Error 404</span>
                <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Página no encontrada</h1>
                <p className="mt-4 text-base text-muted-foreground">
                    El enlace que estás buscando no existe o fue modificado.
                </p>
                <div className="mt-6">
                    <Button asChild>
                        <Link href="/">Volver al inicio</Link>
                    </Button>
                </div>
            </main>
            <Footer />
        </div>
    );
}
