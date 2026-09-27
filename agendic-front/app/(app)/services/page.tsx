import { ServicesList } from './_components/ServicesList';
import { groups } from './_components/mock-services';

export default function ServicesPage() {
    return <ServicesList initialGroups={groups} />;
}
