import { Header } from '@/app/_components/Header';
import { Footer } from '@/app/_components/Footer';
import { getCurrentUser } from './(auth)/current-user';

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    return (
        <>
            <Header user={user} />
            <div className="flex-1 flex flex-col">{children}</div>
            <Footer />
        </>
    );
}
