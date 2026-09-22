import { Topbar } from '../_components/Topbar';
import { TurnosView } from './_components/TurnosView';
import { turnosByTab, pendingCount } from '../_components/mock-turnos';

export default function BookingsPage() {
    return (
        <>
            <Topbar title="Turnos" subtitle="Gestioná la agenda de todas tus sucursales en tiempo real." />
            <TurnosView turnosByTab={turnosByTab} pendingCount={pendingCount} />
        </>
    );
}
