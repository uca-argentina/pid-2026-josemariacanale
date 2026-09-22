import { ImageResponse } from 'next/og';
import { LogoMark } from '@/app/_components/Logo';

export const size = { width: 96, height: 96 };
export const contentType = 'image/png';

// Tailwind doesn't apply inside ImageResponse; the square's color comes from `currentColor` here.
export default function Icon() {
    return new ImageResponse(
        (
            <div style={{ display: 'flex', color: '#0f1b2d' }}>
                <LogoMark size={96} variant="padded" />
            </div>
        ),
        size,
    );
}
