import { notFound } from 'next/navigation';
// Since mock is gone and we don't have a real controller here yet, just pass empty array or mock it locally if needed.
import { type Availability } from '@/src/entities/models/availability';
const myAvailabilities: Availability[] = [];
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
