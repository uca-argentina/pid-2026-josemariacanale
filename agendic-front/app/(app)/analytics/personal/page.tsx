import { PersonalAnalyticsView } from '../_components/PersonalAnalyticsView';
import { myPreferences } from '../../my-preferences';

export const metadata = { title: 'Analíticas · Servicios personales' };

/** Analíticas de los Servicios personales del Usuario con Sesión. */
export default async function PersonalAnalyticsPage() {
    return <PersonalAnalyticsView weekStart={(await myPreferences()).weekStart} />;
}
