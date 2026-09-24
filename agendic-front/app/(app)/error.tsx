'use client';

import { BackendErrorNotice } from '@/app/_components/BackendErrorNotice';

// Inside the panel group, so the boundary replaces only the page and the sidebar stays usable.
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return (
        <div className="flex flex-1 items-center justify-center">
            <BackendErrorNotice onRetry={retry} />
        </div>
    );
}
