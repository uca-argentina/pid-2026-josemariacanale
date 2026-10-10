'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Images, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/_components/ui/avatar';
import { Button } from '@/app/_components/ui/button';
import { bookingLinkPath } from '@/app/routes';
import { SERVICE_CATEGORIES, type ServiceCategoryValue } from '@/app/_components/business-schemas';
import { BranchPhoto } from '@/app/_components/booking/BranchPhoto';
import { ChipTabs } from '@/app/_components/booking/ChipTabs';
import { BookingFlow } from '@/app/_components/booking/BookingFlow';
import { ServiceCard } from '@/app/_components/booking/ServiceCard';
import { initials } from '@/app/_components/booking/format';
import type { Service } from '@/app/_components/booking/types';
import type { Branch, BranchImage, Business, Employee, OtherBranch } from './types';

export function BranchPublicPage({
    business,
    branch,
    otherBranches,
    services,
    employees,
    images,
    selectedService,
}: {
    business: Business;
    branch: Branch;
    otherBranches: OtherBranch[];
    services: Service[];
    employees: Employee[];
    images: BranchImage[];
    /** El Servicio del Enlace de reserva: la reserva abre con él ya elegido. Puede ser oculto, y no estar en `services`. */
    selectedService: Service | null;
}) {
    // Solo las Categorías que esta Sucursal realmente ofrece, en el orden del enum.
    const categories = SERVICE_CATEGORIES.filter((c) => services.some((s) => s.category === c.value));
    const [category, setCategory] = useState<ServiceCategoryValue | undefined>(categories[0]?.value);
    const [initialService, setInitialService] = useState<Service | null>(selectedService);
    const [flowOpen, setFlowOpen] = useState(selectedService !== null);
    const [allImagesOpen, setAllImagesOpen] = useState(false);

    const bookable =
        selectedService && !services.some((s) => s.id === selectedService.id) ? [...services, selectedService] : services;
    const bookableCategories = SERVICE_CATEGORIES.filter((c) => bookable.some((s) => s.category === c.value));

    const openFlow = (service: Service | null) => {
        setInitialService(service);
        setFlowOpen(true);
    };

    const shown = services.filter((s) => s.category === category);
    // La primera Imagen es la de portada: la del resumen y la de la reserva.
    const cover = images[0]?.url;
    // Desde md se ven la portada y hasta dos más al costado; en mobile, solo la portada.
    const sideImages = images.slice(1, 3);
    const hasSide = sideImages.length > 0;

    return (
        <>
            <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 sm:px-8 lg:px-16">
                <header className="pt-6 pb-7">
                    {/* Sin Logo, las iniciales del Negocio. */}
                    <Avatar className="mb-4 size-16">
                        {business.logoUrl && <AvatarImage src={business.logoUrl} alt={`Logo de ${business.name}`} />}
                        <AvatarFallback className="bg-foreground text-[20px] font-extrabold text-white">
                            {initials(business.name)}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[52px]">
                        {business.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px] font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Building2 className="size-4" />
                            Sucursal {branch.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <MapPin className="size-4" />
                            {branch.address}
                        </span>
                    </div>
                </header>

                {/* Sin Imágenes no hay galería: la página arranca directo en los Servicios. */}
                {cover && (
                    <section aria-label="Fotos de la sucursal">
                        <div className={`grid gap-3 ${hasSide ? 'md:grid-cols-[2fr_1fr]' : ''}`}>
                            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-auto md:min-h-[420px]">
                                <BranchPhoto
                                    src={cover}
                                    alt={`Sucursal ${branch.name} de ${business.name}`}
                                    priority
                                    sizes={hasSide ? '(max-width: 768px) 100vw, 66vw' : '100vw'}
                                />
                                {/* Solo cuando quedan Imágenes sin ver: en mobile desde la segunda, desde md desde la cuarta. */}
                                {images.length > 1 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setAllImagesOpen((open) => !open)}
                                        aria-expanded={allImagesOpen}
                                        className={`absolute right-4 bottom-4 h-auto gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold shadow-sm ${images.length <= 3 ? 'md:hidden' : ''}`}
                                    >
                                        <Images className="size-4" />
                                        {allImagesOpen ? 'Ver menos fotos' : 'Ver todas las fotos'}
                                    </Button>
                                )}
                            </div>
                            {hasSide && (
                                <div className={`hidden gap-3 md:grid ${sideImages.length > 1 ? 'grid-rows-2' : 'grid-rows-1'}`}>
                                    {sideImages.map((image) => (
                                        <div key={image.id} className="relative overflow-hidden rounded-2xl">
                                            <BranchPhoto src={image.url} sizes="33vw" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {allImagesOpen && (
                            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                                {images.map((image) => (
                                    <li key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                                        <BranchPhoto src={image.url} sizes="(max-width: 768px) 50vw, 33vw" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_360px]">
                    <section aria-labelledby="servicios-titulo">
                        <h2
                            id="servicios-titulo"
                            className="text-[32px] leading-none font-extrabold tracking-[-0.03em]"
                        >
                            Servicios
                        </h2>

                        {category ? (
                            <>
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
                            </>
                        ) : (
                            <p className="mt-5 text-[14.5px] text-muted-foreground">
                                Esta sucursal todavía no tiene servicios para reservar.
                            </p>
                        )}

                        {employees.length > 0 && (
                            <section aria-labelledby="profesionales-titulo" className="mt-12">
                                {/* Profesionales: mismo rótulo que el panel y el paso Profesional de la reserva. */}
                                <h2
                                    id="profesionales-titulo"
                                    className="text-[24px] leading-none font-extrabold tracking-[-0.03em]"
                                >
                                    Profesionales
                                </h2>
                                <ul className="mt-5 flex flex-wrap gap-3">
                                    {employees.map((employee) => (
                                        <li
                                            key={employee.id}
                                            className="flex items-center gap-2.5 rounded-full border border-border py-1.5 pr-4 pl-1.5"
                                        >
                                            <Avatar>
                                                <AvatarFallback className="bg-muted text-[10px] font-extrabold text-foreground">
                                                    {initials(employee.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-[14px] font-semibold">{employee.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </section>

                    <aside className="lg:sticky lg:top-6">
                        <div className="rounded-2xl border border-border p-5 shadow-[0_1px_2px_rgba(15,27,45,0.04)]">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="relative size-[58px] shrink-0 overflow-hidden rounded-xl">
                                    <BranchPhoto src={cover} sizes="58px" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-[15px] font-extrabold tracking-[-0.02em]">
                                        {business.name}
                                    </h2>
                                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                                        {branch.name} · {branch.address}
                                    </p>
                                </div>
                            </div>
                            {bookable.length > 0 && (
                                <Button
                                    onClick={() => openFlow(selectedService)}
                                    className="h-auto w-full rounded-xl bg-foreground py-3.5 text-[15px] font-bold text-white hover:bg-foreground/90"
                                >
                                    Reservar un turno
                                </Button>
                            )}
                            <p className="mt-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                                {branch.description}
                            </p>
                            <dl className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4 text-[13.5px]">
                                <div className="flex gap-2">
                                    <dt className="sr-only">Dirección</dt>
                                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    <dd className="font-medium">{branch.address}</dd>
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
                                                <Link
                                                    href={bookingLinkPath(business.slug, b.slug)}
                                                    className="font-bold underline-offset-2 hover:underline"
                                                >
                                                    {b.name}
                                                </Link>
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
                    host={{ name: business.name, branch: { name: branch.name, address: branch.address } }}
                    services={bookable}
                    categories={bookableCategories}
                    coverUrl={cover}
                    initialService={initialService}
                    onClose={() => setFlowOpen(false)}
                />
            )}
        </>
    );
}
