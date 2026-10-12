'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/_components/ui/button';
import type { BookingsCsvQuery } from '@/src/entities/models/analytics';
import { downloadBookingsCsvAction } from '../actions';
import { downloadCsv } from './download-csv';

/** "Descargar": baja el CSV de Turnos del rango y los filtros de la página, con un toast si falla. */
export function DownloadBookingsCsvButton({ query }: { query: BookingsCsvQuery }) {
    const [loading, setLoading] = useState(false);

    const download = async () => {
        setLoading(true);
        try {
            const result = await downloadBookingsCsvAction(query);
            if (result.ok) downloadCsv(result.file.filename, result.file.content);
            else toast.error(result.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button type="button" variant="outline" size="sm" disabled={loading} aria-busy={loading} onClick={download}>
            <Download /> {loading ? 'Descargando…' : 'Descargar'}
        </Button>
    );
}
