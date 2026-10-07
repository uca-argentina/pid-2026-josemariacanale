import type { Metadata } from 'next';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { MisTurnosScreen } from './_components/MisTurnosScreen';

export const metadata: Metadata = { title: 'Mis turnos · Agendic' };

export default function MisTurnosPage() {
    return (
        <>
            <Header user={null} nav={false} />
            <div className="flex flex-1 flex-col">
                <MisTurnosScreen />
            </div>
            <Footer />
        </>
    );
}
