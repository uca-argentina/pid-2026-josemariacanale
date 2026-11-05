import { MapPin } from 'lucide-react';
import { PanelIconGroup } from '@/app/(app)/_components/panel-ui';
import { BusinessCard } from './BusinessCard';
import { CopyBookingLinkButton } from './CopyBookingLinkButton';
import { StaffLink } from './StaffLink';

/** Un Negocio de `GET /users/me/businesses` donde el Usuario es Empleado, con sus Sucursales ya resueltas. */
export type EmployeeBusinessData = {
    id: number;
    name: string;
    description: string;
    slug: string;
    logoUrl: string | null;
    /** Solo las Sucursales donde el Usuario trabaja. */
    branches: { id: number; name: string; address: string }[];
};

/** Un Negocio donde el Usuario es Empleado, en solo lectura: sus datos, sus Sucursales y el acceso al Staff. */
export function EmployeeBusiness({ business, defaultOpen }: { business: EmployeeBusinessData; defaultOpen: boolean }) {
    return (
        <BusinessCard
            business={business}
            role="employee"
            defaultOpen={defaultOpen}
            actions={
                <PanelIconGroup>
                    <CopyBookingLinkButton slug={business.slug} />
                </PanelIconGroup>
            }
        >
            <div className="flex flex-col gap-5">
                {business.description && <p className="m-0 text-[13.5px] font-medium leading-relaxed">{business.description}</p>}
                <div className="flex flex-col gap-2">
                    <h2 className="m-0 text-[14.5px] font-bold tracking-[-0.02em]">Tus Sucursales</h2>
                    {business.branches.length === 0 ? (
                        <p className="m-0 text-[13px] font-medium text-[#6b7280]">Todavía no atendés en ninguna Sucursal de este Negocio.</p>
                    ) : (
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            {business.branches.map((branch) => (
                                <li key={branch.id} className="flex items-center gap-2 text-[13px] font-medium">
                                    <MapPin className="size-4 shrink-0 text-[#6b7280]" />
                                    <span className="font-bold">{branch.name}</span>
                                    <span className="truncate text-[#6b7280]">{branch.address}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <StaffLink businessId={business.id} />
            </div>
        </BusinessCard>
    );
}
