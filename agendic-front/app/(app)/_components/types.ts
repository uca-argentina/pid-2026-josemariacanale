export type SectionId =
    | 'bookings'
    | 'availability'
    | 'services'
    | 'business'
    | 'analytics';

export interface NavItem {
    id: SectionId;
    href: string;
    label: string;
    count?: number;
}

export interface CurrentBusinessUser {
    name: string;
    email: string;
    initials: string;
    imageUrl?: string;
}
