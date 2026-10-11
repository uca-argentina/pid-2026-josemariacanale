'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/_components/ui/avatar';
import { initials } from '@/app/_components/booking/format';
import { SERVICE_CATEGORIES } from '@/app/_components/business-schemas';
import { BookingFlow } from '@/app/_components/booking/BookingFlow';
import { ServiceCard } from '@/app/_components/booking/ServiceCard';
import type { Service } from '@/app/_components/booking/types';

/**
 * La página de un Usuario: sus Servicios personales visibles y la reserva, la misma que la de una Sucursal pero sin
 * Sucursal. El Servicio del Enlace de reserva abre la reserva ya elegido; puede ser oculto, y no estar en `services`.
 */
export function UserPublicPage({
    user,
    services,
    selectedService,
}: {
    user: { name: string; imageUrl: string | null };
    services: Service[];
    selectedService: Service | null;
}) {
    const [initialService, setInitialService] = useState<Service | null>(selectedService);
    const [flowOpen, setFlowOpen] = useState(selectedService !== null);

    const bookable =
        selectedService && !services.some((s) => s.id === selectedService.id) ? [...services, selectedService] : services;
    const categories = SERVICE_CATEGORIES.filter((c) => bookable.some((s) => s.category === c.value));

    const openFlow = (service: Service) => {
        setInitialService(service);
        setFlowOpen(true);
    };

    return (
        <>
            <div className="mx-auto w-full max-w-[960px] flex-1 px-4 py-8 sm:px-8">
                <div className="rounded-2xl border border-border bg-background p-6 shadow-[0_1px_2px_rgba(15,27,45,0.04)] sm:p-10">
                    <header className="flex items-center gap-4 pb-7">
                        <Avatar className="size-16 shrink-0">
                            {user.imageUrl && <AvatarImage src={user.imageUrl} alt="" />}
                            <AvatarFallback className="bg-sidebar-accent text-[20px] font-extrabold text-sidebar-accent-foreground">
                                {initials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] text-sidebar-foreground sm:text-[52px]">{user.name}</h1>
                            <p className="mt-3 text-[14.5px] font-medium text-sidebar-muted-foreground">Reservá un turno.</p>
                        </div>
                    </header>

                    <section aria-labelledby="servicios-titulo">
                        <h2 id="servicios-titulo" className="text-[32px] leading-none font-extrabold tracking-[-0.03em] text-sidebar-foreground">
                            Servicios
                        </h2>
                        {services.length > 0 ? (
                            <div className="mt-6 flex flex-col gap-3">
                                {services.map((service) => (
                                    <ServiceCard key={service.id} service={service} onBook={openFlow} panel />
                                ))}
                            </div>
                        ) : (
                            <p className="mt-5 text-[14.5px] text-sidebar-muted-foreground">Todavía no hay servicios para reservar.</p>
                        )}
                    </section>
                </div>
            </div>

            {flowOpen && (
                <BookingFlow
                    host={{ name: user.name, branch: null }}
                    services={bookable}
                    categories={categories}
                    coverUrl={undefined}
                    initialService={initialService}
                    onClose={() => setFlowOpen(false)}
                />
            )}
        </>
    );
}
