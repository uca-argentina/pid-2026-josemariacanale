'use client';

import { useState, useTransition } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm, PanelIconButton, PanelIconGroup, PanelSection } from '@/app/(app)/_components/panel-ui';
import type { StreakReward } from '@/src/entities/models/streak-program';
import { deleteStreakRewardAction } from '../actions';
import { rewardFrequencyLabel, rewardTermsLabel, rewardValidityLabel, type RewardServiceOption } from './streak-form';
import { StreakRewardDialog } from './StreakRewardDialog';

function RewardRow({ reward, onEdit }: { reward: StreakReward; onEdit: () => void }) {
    const [confirming, setConfirming] = useState(false);
    const [isPending, startTransition] = useTransition();
    const terms = rewardTermsLabel(reward);

    const remove = () =>
        startTransition(async () => {
            const result = await deleteStreakRewardAction(reward.id);
            if (!result.ok) toast.error(result.message);
        });

    return (
        <li className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14.5px] font-bold tracking-[-0.02em] break-words text-[#0f1b2d]">{terms}</span>
                <span className="text-[13px] font-medium text-[#6b7280]">
                    {rewardFrequencyLabel(reward)} · {rewardValidityLabel(reward)}
                </span>
            </div>
            <PanelIconGroup>
                <PanelIconButton label={`Editar ${terms}`} disabled={isPending} onClick={onEdit}>
                    <Pencil />
                </PanelIconButton>
                <PanelIconButton label={`Borrar ${terms}`} destructive disabled={isPending} onClick={() => setConfirming(true)}>
                    <Trash2 />
                </PanelIconButton>
            </PanelIconGroup>
            <PanelConfirm
                open={confirming}
                onOpenChange={setConfirming}
                title="¿Borrar esta Recompensa?"
                description="Ningún Cliente va a poder ganarla de nuevo. Los Premios ya ganados siguen en pie."
                confirmLabel="Borrar"
                destructive
                onConfirm={remove}
            />
        </li>
    );
}

/** Las Recompensas del alcance, ya ordenadas por cantidad de Turnos, con su alta, edición y borrado. */
export function StreakRewardsSection({
    businessId,
    rewards,
    services,
}: {
    businessId?: number;
    rewards: StreakReward[];
    services: RewardServiceOption[];
}) {
    const [dialog, setDialog] = useState<{ reward?: StreakReward } | null>(null);

    return (
        <PanelSection
            title="Recompensas"
            description="Lo que gana el Cliente cuando su Racha llega a cierta cantidad de Turnos."
            action={
                <PanelButton onClick={() => setDialog({})}>
                    <Plus className="size-4" />
                    Nueva
                </PanelButton>
            }
        >
            {rewards.length === 0 ? (
                <p className="m-0 px-6 py-5 text-[13px] font-medium text-[#6b7280]">
                    Todavía no cargaste Recompensas. Hasta que cargues una, tus Clientes no ven su Racha.
                </p>
            ) : (
                <ul className="m-0 flex list-none flex-col divide-y divide-[#e5e7eb] p-0">
                    {rewards.map((reward) => (
                        <RewardRow key={reward.id} reward={reward} onEdit={() => setDialog({ reward })} />
                    ))}
                </ul>
            )}
            {dialog && <StreakRewardDialog businessId={businessId} reward={dialog.reward} services={services} onClose={() => setDialog(null)} />}
        </PanelSection>
    );
}
