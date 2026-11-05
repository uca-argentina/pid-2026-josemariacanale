'use client';

import { useRouter } from 'next/navigation';
import { ScopeSelect } from '@/app/(app)/_components/ScopeSelect';
import { streaksPath } from '@/app/routes';

/** El alcance de la pantalla: cada uno trae sus Rachas del servidor, así que cambiarlo navega. */
export function StreaksScopeSelect({
    user,
    business,
    selected,
}: {
    user: { name: string; imageUrl: string | null };
    business: { id: number; name: string };
    selected: number | undefined;
}) {
    const router = useRouter();
    return <ScopeSelect label="Ver Rachas de" user={user} businesses={[business]} selected={selected} onChange={(id) => router.replace(streaksPath(id))} />;
}
