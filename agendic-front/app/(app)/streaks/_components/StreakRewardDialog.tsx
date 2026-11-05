'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    PanelButton,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelNumberField,
    PanelSelect,
    PanelTextarea,
} from '@/app/(app)/_components/panel-ui';
import { GIFT_DESCRIPTION_MAX, type StreakReward, type StreakRewardType } from '@/src/entities/models/streak-program';
import { createStreakRewardAction, updateStreakRewardAction } from '../actions';
import {
    draftOfReward,
    NEW_REWARD_DRAFT,
    parseRewardDraft,
    rewardServiceOptions,
    type RewardDraft,
    type RewardField,
    type RewardServiceOption,
} from './streak-form';

const TYPE_OPTIONS: { value: StreakRewardType; label: string }[] = [
    { value: 'PERCENT_DISCOUNT', label: 'Descuento porcentual' },
    { value: 'AMOUNT_DISCOUNT', label: 'Descuento de monto fijo' },
    { value: 'GIFT', label: 'Regalo' },
    { value: 'FREE_SERVICE', label: 'Servicio gratis' },
];

/** Alta (sin `reward`) o edición de una Recompensa, con los campos que pide su tipo. */
export function StreakRewardDialog({
    businessId,
    reward,
    services,
    onClose,
}: {
    businessId?: number;
    reward?: StreakReward;
    services: RewardServiceOption[];
    onClose: () => void;
}) {
    const [draft, setDraft] = useState<RewardDraft>(reward ? draftOfReward(reward) : NEW_REWARD_DRAFT);
    const [errors, setErrors] = useState<Partial<Record<RewardField, string>>>({});
    const [isPending, startTransition] = useTransition();
    const set = (change: Partial<RewardDraft>) => setDraft((current) => ({ ...current, ...change }));
    const describedBy = (field: RewardField) => (errors[field] ? `reward-${field}-error` : undefined);
    const serviceOptions = rewardServiceOptions(services, reward?.service ?? null);

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = parseRewardDraft(draft);
        if ('errors' in parsed) return setErrors(parsed.errors);
        setErrors({});
        startTransition(async () => {
            const result = reward ? await updateStreakRewardAction(reward.id, parsed.fields) : await createStreakRewardAction(businessId, parsed.fields);
            if (result.ok) onClose();
            else if (result.field && result.field !== 'burnAfterDays') setErrors({ [result.field]: result.message });
            else toast.error(result.message);
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !isPending && onClose()}
            title={reward ? 'Editar Recompensa' : 'Nueva Recompensa'}
            description={reward ? 'Los cambios no tocan los Premios ya ganados.' : 'Lo que gana el Cliente cuando su Racha llega a cierta cantidad de Turnos.'}
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost" disabled={isPending}>
                            Cerrar
                        </PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form="streak-reward" disabled={isPending} className="min-w-[88px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                    </PanelButton>
                </>
            }
        >
            <form id="streak-reward" onSubmit={save} noValidate className="flex flex-col gap-6">
                <div className="grid gap-6 sm:grid-cols-2">
                    <PanelField label="Cantidad de Turnos" htmlFor="reward-requiredCount" error={errors.requiredCount}>
                        <PanelNumberField
                            id="reward-requiredCount"
                            min={1}
                            suffix="Turnos"
                            value={draft.requiredCount}
                            aria-describedby={describedBy('requiredCount')}
                            onValueChange={(requiredCount) => set({ requiredCount })}
                        />
                    </PanelField>
                    <PanelField label="Se gana" htmlFor="reward-repeatable">
                        <PanelSelect
                            id="reward-repeatable"
                            value={draft.repeatable ? 'every' : 'once'}
                            options={[
                                { value: 'once', label: 'Una vez por Racha' },
                                { value: 'every', label: `Cada ${draft.requiredCount || 'N'} Turnos` },
                            ]}
                            onValueChange={(value) => set({ repeatable: value === 'every' })}
                        />
                    </PanelField>
                </div>
                <PanelField label="Tipo" htmlFor="reward-type">
                    <PanelSelect
                        id="reward-type"
                        value={draft.type}
                        options={TYPE_OPTIONS}
                        onValueChange={(type) => {
                            set({ type: type as StreakRewardType });
                            setErrors(({ requiredCount, validForDays }) => ({ requiredCount, validForDays }));
                        }}
                    />
                </PanelField>
                {draft.type === 'PERCENT_DISCOUNT' && (
                    <PanelField label="Porcentaje" htmlFor="reward-value" error={errors.value}>
                        <PanelNumberField
                            id="reward-value"
                            min={1}
                            max={100}
                            suffix="%"
                            value={draft.value}
                            aria-describedby={describedBy('value')}
                            onValueChange={(value) => set({ value })}
                        />
                    </PanelField>
                )}
                {draft.type === 'AMOUNT_DISCOUNT' && (
                    <PanelField label="Monto" htmlFor="reward-value" error={errors.value}>
                        <PanelNumberField
                            id="reward-value"
                            min={0}
                            grouping
                            prefix="$"
                            suffix="ARS"
                            value={draft.value}
                            aria-describedby={describedBy('value')}
                            onValueChange={(value) => set({ value })}
                        />
                    </PanelField>
                )}
                {draft.type === 'GIFT' && (
                    <PanelField label="Regalo" htmlFor="reward-description" error={errors.description}>
                        <PanelTextarea
                            id="reward-description"
                            maxLength={GIFT_DESCRIPTION_MAX}
                            placeholder="Un lavado de cabello"
                            value={draft.description}
                            aria-describedby={describedBy('description')}
                            onChange={(event) => set({ description: event.target.value })}
                        />
                    </PanelField>
                )}
                {draft.type === 'FREE_SERVICE' && (
                    <PanelField
                        label="Servicio"
                        htmlFor="reward-serviceId"
                        error={errors.serviceId}
                        hint={serviceOptions.length === 0 ? 'Todavía no tenés Servicios para elegir.' : undefined}
                    >
                        <PanelSelect
                            id="reward-serviceId"
                            value={draft.serviceId}
                            options={serviceOptions}
                            placeholder="Elegí un Servicio"
                            disabled={serviceOptions.length === 0}
                            onValueChange={(serviceId) => set({ serviceId })}
                        />
                    </PanelField>
                )}
                <PanelField
                    label="Vigencia (opcional)"
                    htmlFor="reward-validForDays"
                    error={errors.validForDays}
                    hint="Cuántos días vale el Premio una vez ganado. Vacía, no vence."
                >
                    <PanelNumberField
                        id="reward-validForDays"
                        min={1}
                        suffix="días"
                        value={draft.validForDays}
                        aria-describedby={describedBy('validForDays')}
                        onValueChange={(validForDays) => set({ validForDays })}
                    />
                </PanelField>
            </form>
        </PanelDialog>
    );
}
