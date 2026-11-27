import { Alert, AlertDescription, AlertTitle } from '@/app/_components/ui/alert';

export function ErrorAlert({ message, title }: { message: string; title?: string }) {
    return (
        <Alert variant="error">
            {title && <AlertTitle>{title}</AlertTitle>}
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}
