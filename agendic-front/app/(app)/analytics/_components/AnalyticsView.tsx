'use client';

import { useSearchParams } from 'next/navigation';
import type { AnalyticsBusiness } from '@/src/entities/models/analytics';
import type { Preferences } from '@/src/entities/models/user';
import { businessSearch, parseBusinessFilters } from './analytics-range';
import { BusinessAnalyticsView } from './BusinessAnalyticsView';
import { PersonalAnalyticsView } from './PersonalAnalyticsView';
import { ScopeSelect } from './ScopeSelect';

/**
 * Analíticas en una sola página: con `?businessId=` de uno de `businesses`, las de ese Negocio; si no, las personales
 * del Usuario. El selector de alcance cambia el `businessId` de la URL y saca los filtros del alcance anterior.
 */
export function AnalyticsView({
    user,
    businesses,
    weekStart,
}: {
    user: { name: string; imageUrl: string | null };
    businesses: AnalyticsBusiness[];
    weekStart: Preferences['weekStart'];
}) {
    const searchParams = useSearchParams();
    const { business } = parseBusinessFilters(searchParams, businesses);
    const selector = (
        <ScopeSelect
            user={user}
            businesses={businesses}
            selected={business?.id}
            onChange={(id) => window.history.replaceState(null, '', `${window.location.pathname}${businessSearch(window.location.search, id)}`)}
        />
    );

    return business ? (
        <BusinessAnalyticsView businesses={businesses} weekStart={weekStart} selector={selector} />
    ) : (
        <PersonalAnalyticsView weekStart={weekStart} selector={selector} />
    );
}
