import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/app/_components/Header';
import { Footer } from '@/app/_components/Footer';
import { BranchPublicPage } from '@/app/businessPage/_components/BranchPublicPage';
import { categories as defaultCategories, photos } from '@/app/businessPage/_components/mock-business';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

interface BusinessSlugPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BusinessSlugPageProps): Promise<Metadata> {
    const { slug } = await params;
    try {
        const data = await getInjection('IGetPublicBusinessController')({ slug });
        return {
            title: `${data.business.name} · Reservá tu turno`,
            description: data.business.description,
        };
    } catch {
        return {
            title: 'Negocio no encontrado',
        };
    }
}

export default async function BusinessSlugPage({ params }: BusinessSlugPageProps) {
    const { slug } = await params;

    let data;
    try {
        data = await getInjection('IGetPublicBusinessController')({ slug });
    } catch (error) {
        if (error instanceof NotFoundError || error instanceof InputParseError) {
            notFound();
        }
        getInjection('ICrashReporterService').report(error);
        throw error;
    }

    const serviceCategoryValues = new Set(data.services.map((s) => s.category));
    const activeCategories = defaultCategories.filter((c) => serviceCategoryValues.has(c.value));
    const categories = activeCategories.length > 0 ? activeCategories : defaultCategories;

    return (
        <>
            <Header user={null} nav={false} />
            <div className="flex flex-1 flex-col">
                {data.branch ? (
                    <BranchPublicPage
                        business={data.business}
                        branch={data.branch}
                        branches={data.branches}
                        services={data.services}
                        categories={categories}
                        photos={photos}
                    />
                ) : (
                    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center p-8 text-center">
                        <h1 className="text-2xl font-bold">{data.business.name}</h1>
                        <p className="mt-2 text-muted-foreground">Este negocio aún no tiene sucursales activas.</p>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
