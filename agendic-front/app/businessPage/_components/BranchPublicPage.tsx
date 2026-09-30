'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, MapPin, Images, Building2, X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import type { ServiceCategoryValue } from '@/app/_components/business-schemas';
import { ChipTabs } from './ChipTabs';
import { BookingFlow } from './BookingFlow';
import { MyBookings } from './MyBookings';
import { formatDuration, formatPrice } from './mock-business';
import type { Booking, Branch, Business, Service } from './types';

function ServiceCard({
    service,
    onBook,
}: {
    service: Service;
    onBook: (service: Service) => void;
}) {
    return (
        <article className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4.5 transition-colors hover:border-foreground/20 sm:flex-nowrap">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-[15.5px] font-bold tracking-[-0.02em]">{service.name}</h3>
                <span className="text-[13px] font-medium text-muted-foreground">
                    {formatDuration(service.durationMinutes)}
                </span>
                {service.description && (
                    <p className="mt-0.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
                        {service.description}
                    </p>
                )}
                <span className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="text-[15px] font-extrabold tracking-[-0.025em]">
                        {formatPrice(service.price)}
                    </span>
                    {service.depositPercent && (
                        <span className="text-[12.5px] font-semibold text-muted-foreground">
                            {service.depositPercent}% de seña
                        </span>
                    )}
                </span>
            </div>
            <Button
                onClick={() => onBook(service)}
                variant="outline"
                className="h-auto shrink-0 rounded-full px-5 py-2.5 text-[13.5px] font-bold"
            >
                Reservar
            </Button>
        </article>
    );
}

export function BranchPublicPage({
    business,
    branch,
    branches,
    services,
    categories,
}: {
    business: Business;
    branch: Branch;
    branches: Branch[];
    services: Service[];
    categories: readonly { value: ServiceCategoryValue; label: string }[];
}) {
    const [category, setCategory] = useState<ServiceCategoryValue>(categories[0].value);
    const [initialService, setInitialService] = useState<Service | null>(null);
    const [flowOpen, setFlowOpen] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(branch);

    const photos = currentBranch.images?.length > 0 ? currentBranch.images : ['https://picsum.photos/seed/placeholder-currentBranch/1200/900'];

    const openFlow = (service: Service | null) => {
        setInitialService(service);
        setFlowOpen(true);
    };

    if (booking) {
        return <MyBookings booking={booking} onBackToBusiness={() => setBooking(null)} />;
    }

    const otherBranches = branches.filter((b) => b.id !== currentBranch.id);
    const shown = services.filter((s) => s.category === category);

    return (
        <>
            <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 sm:px-8 lg:px-16">
                <header className="pt-6 pb-7">
                    <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[52px]">
                        {business.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px] font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Building2 className="size-4" />
                            Sucursal {currentBranch.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="size-4" />
                            Atiende de {currentBranch.opensAt} a {currentBranch.closesAt}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <MapPin className="size-4" />
                            {currentBranch.address}
                        </span>
                    </div>
                </header>

                <section aria-label="Fotos de la sucursal" className="grid gap-3 md:grid-cols-[2fr_1fr]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-auto md:min-h-[420px]">
                        <Image
                            src={photos[0]}
                            alt={`Sucursal ${currentBranch.name} de ${business.name}`}
                            fill
                            priority
                            sizes="(max-width: 768px) 100vw, 66vw"
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                    <div className="hidden grid-rows-2 gap-3 md:grid">
                        {photos.slice(1, 3).map((src, i) => (
                            <div key={src} className="relative overflow-hidden rounded-2xl">
                                <Image src={src} alt="" fill sizes="33vw" className="object-cover" unoptimized />
                                {i === 1 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setGalleryOpen(true)}
                                        className="absolute right-4 bottom-4 h-auto gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold shadow-sm"
                                    >
                                        <Images className="size-4" />
                                        Ver todas las fotos
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_360px]">
                    <section aria-labelledby="servicios-titulo">
                        <h2
                            id="servicios-titulo"
                            className="text-[32px] leading-none font-extrabold tracking-[-0.03em]"
                        >
                            Servicios
                        </h2>

                        <div className="mt-5">
                            <ChipTabs
                                options={categories}
                                value={category}
                                onSelect={setCategory}
                                label="Categoría de servicio"
                            />
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            {shown.map((service) => (
                                <ServiceCard key={service.id} service={service} onBook={openFlow} />
                            ))}
                        </div>
                    </section>

                    <aside className="lg:sticky lg:top-6">
                        <div className="rounded-2xl border border-border p-5 shadow-[0_1px_2px_rgba(15,27,45,0.04)]">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="relative size-[58px] shrink-0 overflow-hidden rounded-xl">
                                    <Image
                                        src={photos[0]}
                                        alt=""
                                        fill
                                        sizes="58px"
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-[15px] font-extrabold tracking-[-0.02em]">
                                        {business.name}
                                    </h2>
                                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                                        {currentBranch.name} · {currentBranch.address}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => openFlow(null)}
                                className="h-auto w-full rounded-xl bg-foreground py-3.5 text-[15px] font-bold text-white hover:bg-foreground/90"
                            >
                                Reservar un turno
                            </Button>
                            <p className="mt-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                                {business.description}
                            </p>
                            <dl className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4 text-[13.5px]">
                                <div className="flex gap-2">
                                    <dt className="sr-only">Horario</dt>
                                    <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    <dd className="font-medium">
                                        {currentBranch.opensAt} a {currentBranch.closesAt}
                                    </dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt className="sr-only">Dirección</dt>
                                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    <dd className="font-medium">{currentBranch.address}</dd>
                                </div>
                            </dl>

                            {otherBranches.length > 0 && (
                                <div className="mt-4 border-t border-border pt-4">
                                    <h3 className="text-[12px] font-extrabold tracking-[0.02em] text-muted-foreground uppercase">
                                        Otras sucursales
                                    </h3>
                                    <ul className="mt-2.5 flex flex-col gap-2">
                                        {otherBranches.map((b) => (
                                            <li key={b.id} className="text-[13.5px]">
                                                {/* ponytail: Branch no tiene slug todavía; cuando lo tenga, esto es un Link a /{business.slug}/{b.slug}. */}
                                                <button onClick={() => setCurrentBranch(b)} className="font-bold text-left hover:underline">{b.name}</button>
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    · {b.address}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            {flowOpen && (
                <BookingFlow
                    business={business}
                    branch={currentBranch}
                    services={services}
                    categories={categories}
                    photo={photos[0]}
                    initialService={initialService}
                    onClose={() => setFlowOpen(false)}
                    onBooked={(created) => {
                        setFlowOpen(false);
                        setBooking(created);
                    }}
                />
            )}

            {galleryOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-background">
                    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                        <span className="font-semibold">Fotos de la sucursal</span>
                        <Button variant="ghost" size="icon" onClick={() => setGalleryOpen(false)}>
                            <X className="size-5" />
                        </Button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        <div className="mx-auto max-w-4xl space-y-8">
                            {currentBranch.images.length > 0 ? currentBranch.images.map((src) => (
                                <div key={src} className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                                    <Image src={src} alt="" fill className="object-contain" unoptimized />
                                </div>
                            )) : (
                                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                    <Images className="size-16 opacity-20" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
