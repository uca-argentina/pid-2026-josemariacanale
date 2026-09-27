'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PanelButton, PanelCard, PanelToggleRow } from '@/app/(app)/_components/panel-ui';
import { cn } from '@/app/_components/utils';

// ponytail: todo es estado local y se pierde al recargar; el back todavía no guarda la apariencia del Negocio.

type Theme = 'system' | 'light' | 'dark';

const THEMES: { value: Theme; label: string }[] = [
    { value: 'system', label: 'Predeterminado del sistema' },
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
];

const TOGGLES = [
    { id: 'brand-colors', title: 'Colores de marca', description: 'Usá los colores de tu marca en tu Enlace de reserva.' },
    {
        id: 'hide-branding',
        title: 'Ocultar la marca Agendic',
        description: 'Saca las menciones a Agendic, como "Con la tecnología de Agendic".',
    },
    {
        id: 'hide-employee-choice',
        title: 'Ocultar la elección de Empleado',
        description: 'Tus Clientes reservan sin elegir con quién se atienden.',
    },
    {
        id: 'hide-business-link',
        title: 'Ocultar el enlace al Negocio',
        description: 'Saca el enlace a la página de tu Negocio de las páginas de reserva de cada Servicio.',
    },
];

const UPDATED = 'Tu Negocio se actualizó';

/** Una página de reserva en miniatura, clara u oscura. */
function MiniPage({ dark }: { dark: boolean }) {
    const line = dark ? 'bg-[#4b5563]' : 'bg-[#d1d5db]';
    return (
        <div className={cn('flex h-full min-w-0 flex-1 items-end px-3 pt-4', dark ? 'bg-[#374151]' : 'bg-[#e5e7eb]')}>
            <div className={cn('flex h-4/5 w-full flex-col items-center gap-1.5 rounded-t-md pt-3', dark ? 'bg-[#111827]' : 'bg-white')}>
                <span className={cn('size-4 rounded-full', line)} />
                <span className={cn('h-1 w-10 rounded-full', line)} />
                <span className={cn('mt-2 h-1 w-3/4 rounded-full', line)} />
                <span className={cn('h-1 w-2/3 rounded-full', line)} />
            </div>
        </div>
    );
}

export function AppearanceView() {
    const [savedTheme, setSavedTheme] = useState<Theme>('system');
    const [theme, setTheme] = useState<Theme>('system');
    const [toggles, setToggles] = useState<Record<string, boolean>>({});

    return (
        <div className="flex max-w-[880px] flex-col gap-6">
            <PanelCard className="overflow-hidden p-0">
                <div className="flex flex-col gap-0.5 border-b border-[#e5e7eb] px-6 py-5">
                    <h2 className="m-0 text-[14.5px] font-bold tracking-[-0.02em]">Tema del Enlace de reserva</h2>
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">Solo se aplica a tu Enlace de reserva.</p>
                </div>
                <fieldset className="m-0 grid grid-cols-1 gap-4 border-0 p-6 sm:grid-cols-3">
                    <legend className="sr-only">Tema</legend>
                    {THEMES.map((t) => (
                        <label key={t.value} className="group flex cursor-pointer flex-col items-center gap-2.5">
                            <input
                                type="radio"
                                name="theme"
                                value={t.value}
                                checked={theme === t.value}
                                onChange={() => setTheme(t.value)}
                                className="peer sr-only"
                            />
                            <div className="flex h-28 w-full overflow-hidden rounded-md ring-offset-2 transition-shadow group-hover:ring-1 group-hover:ring-[#9ca3af] peer-checked:ring-2 peer-checked:ring-[#0f1b2d] peer-focus-visible:ring-2 peer-focus-visible:ring-[#0f1b2d]">
                                {t.value === 'system' ? (
                                    <>
                                        <MiniPage dark={false} />
                                        <MiniPage dark />
                                    </>
                                ) : (
                                    <MiniPage dark={t.value === 'dark'} />
                                )}
                            </div>
                            <span className="text-[13px] font-semibold text-[#374151] peer-checked:font-bold peer-checked:text-[#0f1b2d]">
                                {t.label}
                            </span>
                        </label>
                    ))}
                </fieldset>
                <div className="flex justify-end border-t border-[#e5e7eb] bg-[#f9fafb] px-6 py-4">
                    <PanelButton
                        disabled={theme === savedTheme}
                        onClick={() => {
                            setSavedTheme(theme);
                            toast.success(UPDATED);
                        }}
                    >
                        Actualizar
                    </PanelButton>
                </div>
            </PanelCard>

            {TOGGLES.map((t) => (
                <PanelCard key={t.id}>
                    <PanelToggleRow
                        id={t.id}
                        title={t.title}
                        description={t.description}
                        checked={Boolean(toggles[t.id])}
                        onCheckedChange={(checked) => {
                            setToggles((prev) => ({ ...prev, [t.id]: checked }));
                            toast.success(UPDATED);
                        }}
                    />
                </PanelCard>
            ))}
        </div>
    );
}
