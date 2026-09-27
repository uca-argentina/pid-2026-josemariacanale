import { myAvailabilities } from '@/app/(app)/_components/mock-availability';
import { groups } from '@/app/(app)/_components/mock-services';
import { AvailabilityView } from './_components/AvailabilityView';

// ponytail: mock; los Servicios que atendés salen del mock de Servicios. Con backend, un controller.
const offeredServices = groups.flatMap((g) =>
    g.services
        .filter((s) => s.offeredByMe)
        .map((s) => ({ id: s.id, name: s.name, availabilityId: s.availabilityId })),
);

export default function AvailabilityPage() {
    return <AvailabilityView initialAvailabilities={myAvailabilities} initialServices={offeredServices} />;
}
