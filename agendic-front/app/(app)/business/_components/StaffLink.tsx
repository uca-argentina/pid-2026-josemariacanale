import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { staffPath } from '@/app/routes';

/** El acceso al Staff de un Negocio, para su Dueño y para sus Empleados. */
export function StaffLink({ businessId }: { businessId: number }) {
    return (
        <Link
            href={staffPath(businessId)}
            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3.5 text-[13px] font-bold text-[#0f1b2d] transition-colors outline-none hover:bg-[#f3f4f6] focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-1 [&_svg]:size-4"
        >
            Ver Staff
            <ArrowRight />
        </Link>
    );
}
