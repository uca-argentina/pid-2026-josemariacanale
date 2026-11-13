import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';
import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { WaitlistEntryView } from '@/src/entities/models/waitlist';
import { LeaveWaitlistScreen } from './LeaveWaitListScreen';


export const metadata: Metadata = {
    title: 'Lista de espera · Agendic',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
};

type LoadedEntry = { entry: WaitlistEntryView } | { failed: true };

async function loadEntry(link: string): Promise<LoadedEntry> {
    try {
        return { entry: await getInjection('IGetWaitlistEntryByLinkController')({ link }) };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof NotFoundError || error instanceof InputParseError) notFound();
        getInjection('ICrashReporterService').report(error);
        return { failed: true };
    }
}

export default async function WaitlistLinkPage({ params }: { params: Promise<{ link: string }> }) {
    const { link } = await params;
    const loaded = await loadEntry(link);

    return (
        <>
            <Header user={null} nav={false} />
            <div className="flex flex-1 flex-col">
                {'entry' in loaded ? <LeaveWaitlistScreen link={link} entry={loaded.entry} /> : <BackendErrorNotice />}
            </div>
            <Footer />
        </>
    );
}
