import type { ComponentProps } from 'react';
import type { SignIn } from '@clerk/nextjs';

type Appearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

export const clerkAppearance: Appearance = {
    options: {
        unsafe_disableDevelopmentModeWarnings: true,
        socialButtonsPlacement: 'bottom',
    },
    variables: {
        colorPrimary: '#0f1b2d',
        colorPrimaryForeground: '#ffffff',
        colorForeground: '#0f1b2d',
        colorMutedForeground: '#4b5567',
        colorBorder: '#e6e9f0',
        colorInput: '#e6e9f0',
        colorBackground: '#ffffff',
        colorDanger: '#dc2626',
        colorShadow: 'transparent',
    },
    elements: {
        rootBox: 'w-full',
        cardBox: 'w-full border-0 shadow-none rounded-none',
        card: 'border-0 shadow-none bg-transparent p-0 gap-0',
        footer: 'bg-transparent',
        footerAction: 'bg-transparent',
        headerTitle: 'text-[25px] font-extrabold text-foreground',
        headerSubtitle: 'text-[14px] text-muted-foreground',
        formFieldLabel: 'text-[12.5px] font-semibold text-muted-foreground',
        formFieldInput: 'h-auto px-3.5 py-3 rounded-lg',
        formButtonPrimary:
            'text-[14px] font-bold text-white bg-primary px-4.5 py-3 rounded-[10px] hover:bg-primary/90 shadow-none',
        socialButtonsBlockButton:
            'text-[14px] font-semibold text-foreground bg-white border-[1.5px] border-[#d6dbe6] py-[11px] rounded-[10px] hover:bg-gray-50 shadow-none',
        dividerLine: 'bg-border',
        dividerText: 'text-[12px] text-muted-foreground',
        footerActionText: 'text-[13px] text-muted-foreground',
        footerActionLink:
            'text-[13px] font-semibold text-foreground hover:text-primary',
    },
};
