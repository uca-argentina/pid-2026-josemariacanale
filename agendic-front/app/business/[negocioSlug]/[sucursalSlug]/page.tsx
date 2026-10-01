import type { Metadata } from 'next';
import { PublicBranchScreen, publicBranchMetadata } from './_components/PublicBranchScreen';

type Params = { negocioSlug: string; sucursalSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { negocioSlug, sucursalSlug } = await params;
    return publicBranchMetadata({ businessSlug: negocioSlug, branchSlug: sucursalSlug });
}

export default async function PublicBranchPage({ params }: { params: Promise<Params> }) {
    const { negocioSlug, sucursalSlug } = await params;
    return <PublicBranchScreen businessSlug={negocioSlug} branchSlug={sucursalSlug} />;
}
