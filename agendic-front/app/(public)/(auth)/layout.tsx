import { redirect } from 'next/navigation';
import { ViewTransition } from 'react';
import { SIGNED_IN_HOME_PATH } from '@/app/routes';
import { getCurrentUser } from './current-user';

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (user) redirect(SIGNED_IN_HOME_PATH);

    return (
        <main className="flex-1 flex px-6 py-10">
            <div
                className="flex-1 rounded-[28px] p-8 box-border flex items-center justify-center"
                style={{
                    background:
                        'linear-gradient(160deg,#cfe4f7 0%,#d9edf0 32%,#e3f2e2 62%,#eef6da 100%)',
                }}
            >
                <ViewTransition
                    update={{ 'auth-nav': 'auth-morph', default: 'none' }}
                    default="none"
                >
                    {children}
                </ViewTransition>
            </div>
        </main>
    );
}
