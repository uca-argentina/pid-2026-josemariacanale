import { ChartAreaInteractive } from './_components/ChartAreaInteractive';
import { DataTable } from './_components/DataTable';
import { SectionCards } from './_components/SectionCards';
import { services } from './_components/mock-analytics';

export const metadata = { title: 'Analíticas' };

/** Cómo se vería un tablero de analíticas del Negocio: el contenido del bloque `dashboard-01`, con datos de ejemplo. */
export default function AnalyticsPage() {
    return (
        <div className="flex flex-1 flex-col gap-4 py-4 text-[#0f1b2d] @3xl/main:gap-6 @3xl/main:py-6">
            <h1 className="m-0 px-4 text-[21px] font-extrabold tracking-[-0.035em] lg:px-6">Analíticas</h1>
            <SectionCards />
            <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
            </div>
            <DataTable data={services} />
        </div>
    );
}
