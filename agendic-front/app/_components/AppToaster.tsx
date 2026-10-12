import { Check, X } from 'lucide-react';
import { Toaster } from 'sonner';

/** Los avisos de `toast` de sonner, con el estilo de Agendic; montarlo una vez por página que los use. */
export function AppToaster() {
    return (
        <Toaster
            position="bottom-center"
            closeButton
            icons={{ success: <Check className="size-4" />, error: <X className="size-4 text-[#b91c1c]" /> }}
            toastOptions={{
                unstyled: true,
                classNames: {
                    toast: 'flex w-[360px] items-center gap-3 rounded-md border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] font-semibold text-[#0f1b2d] shadow-[0_10px_30px_rgba(15,27,45,0.12)]',
                    closeButton: 'order-last ml-auto shrink-0 text-[#6b7280] hover:text-[#0f1b2d] [&_svg]:size-4',
                },
            }}
        />
    );
}
