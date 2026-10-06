'use client';

import { useState } from 'react';
import { SERVICE_CATEGORIES } from '@/app/_components/business-schemas';
import { BookingFlow } from '@/app/_components/booking/BookingFlow';
import { MyBookings } from '@/app/_components/booking/MyBookings';
import { ServiceCard } from '@/app/_components/booking/ServiceCard';
import type { Booking, Service } from '@/app/_components/booking/types';

/**
 * La página de un Usuario: sus Servicios personales visibles y la reserva, la misma que la de una Sucursal pero sin
 * Sucursal. El Servicio del Enlace de reserva abre la reserva ya elegido; puede ser oculto, y no estar en `services`.
 */
export function UserPublicPage({
    user,
    services,
    selectedService,
}: {
    user: { name: string };
    services: Service[];
    selectedService: Service | null;
}) {
    const [initialService, setInitialService] = useState<Service | null>(selectedService);
    const [flowOpen, setFlowOpen] = useState(selectedService !== null);
    const [booking, setBooking] = useState<Booking | null>(null);

    const bookable =
        selectedService && !services.some((s) => s.id === selectedService.id) ? [...services, selectedService] : services;
    const categories = SERVICE_CATEGORIES.filter((c) => bookable.some((s) => s.category === c.value));

    const openFlow = (service: Service) => {
        setInitialService(service);
        setFlowOpen(true);
    };

    if (booking) return <MyBookings booking={booking} onBack={() => setBooking(null)} />;

    return (
        <>
            <div className="mx-auto w-full max-w-[960px] flex-1 px-4 pb-20 sm:px-8">
                <header className="pt-6 pb-7">
                    <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[52px]">{user.name}</h1>
                    <p className="mt-3 text-[14.5px] font-medium text-muted-foreground">Reservá un turno.</p>
                </header>

                <section aria-labelledby="servicios-titulo">
                    <h2 id="servicios-titulo" className="text-[32px] leading-none font-extrabold tracking-[-0.03em]">
                        Servicios
                    </h2>
                    {services.length > 0 ? (
                        <div className="mt-6 flex flex-col gap-3">
                            {services.map((service) => (
                                <ServiceCard key={service.id} service={service} onBook={openFlow} />
                            ))}
                        </div>
                    ) : (
                        <p className="mt-5 text-[14.5px] text-muted-foreground">Todavía no hay servicios para reservar.</p>
                    )}
                </section>
            </div>

            {flowOpen && (
                <BookingFlow
                    host={{ name: user.name, branch: null }}
                    services={bookable}
                    categories={categories}
                    coverUrl={undefined}
                    initialService={initialService}
                    onClose={() => setFlowOpen(false)}
                    onBooked={(created) => {
                        setFlowOpen(false);
                        setBooking(created);
                    }}
                />
            )}
        </>
    );
}
