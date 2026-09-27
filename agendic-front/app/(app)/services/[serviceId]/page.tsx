import { notFound } from 'next/navigation';
import { myAvailabilities } from '@/app/(app)/_components/mock-availability';
import { findService } from '@/app/(app)/_components/mock-services';
import { ServiceDetail } from './_components/ServiceDetail';

export default async function ServicePage({ params }: { params: Promise<{ serviceId: string }> }) {
    const { serviceId } = await params;
    const found = findService(serviceId);
    if (!found) notFound();

    return (
        <ServiceDetail
            business={found.group.business}
            role={found.group.role}
            service={found.service}
            availabilities={myAvailabilities}
        />
    );
}
