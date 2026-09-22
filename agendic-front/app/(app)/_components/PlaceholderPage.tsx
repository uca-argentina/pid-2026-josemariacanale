import { Topbar } from './Topbar';
import { PlaceholderView } from './PlaceholderView';

export function PlaceholderPage({ title }: { title: string }) {
    return (
        <>
            <Topbar title={title} />
            <PlaceholderView title={title} />
        </>
    );
}
