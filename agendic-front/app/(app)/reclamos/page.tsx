import { back } from '@/app/_components/back';
import { Alert, AlertDescription } from '@/app/_components/ui/alert';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/app/_components/ui/empty';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/_components/ui/table';
import { TextDialog } from '@/app/_components/quick/TextDialog';
import { responderReclamo } from './actions';

type Reclamo = {
    id: number;
    status: 'OPEN' | 'CLOSED';
    reason: string;
    createdAt: string;
    response: string;
};

export default async function ReclamosPage() {
    const result = await back<{ data: Reclamo[] }>('GET', `/claims`, {
        auth: true,
    });
    if (!result.ok) {
        return (
            <Alert variant="error">
                <AlertDescription>{result.message}</AlertDescription>
            </Alert>
        );
    }

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
            <h1 className="text-xl font-semibold">Reclamos</h1>

            {result.data.data.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No hay reclamos todavía</EmptyTitle>
                        <EmptyDescription>
                            Cuando haya, aparece acá.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>id</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estatus</TableHead>
                            <TableHead>Respuesta</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.data.data.map((cosa) => (
                            <TableRow key={cosa.id}>
                                <TableCell className="whitespace-normal">
                                    {cosa.id}
                                </TableCell>
                                <TableCell className="whitespace-normal">
                                    {cosa.reason}
                                </TableCell>
                                <TableCell>
                                    {new Date(cosa.createdAt).toLocaleString(
                                        'es-AR',
                                    )}
                                </TableCell>
                                <TableCell className="whitespace-normal">
                                    {cosa.status}
                                </TableCell>
                                <TableCell className="whitespace-normal">
                                    {cosa.response}
                                </TableCell>
                                {cosa.status == 'OPEN' ? (
                                    <TableCell className="text-right">
                                        <TextDialog
                                            action={responderReclamo.bind(
                                                null,
                                                cosa.id,
                                            )}
                                            trigger="Responder"
                                            title={`Responder reclamo #${cosa.id}`}
                                            label="Respuesta"
                                            submitLabel="Responder"
                                        />
                                    </TableCell>
                                ) : (
                                    <></>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </main>
    );
}
