export type SectionId =
    | 'bookings'
    | 'availability'
    | 'services'
    | 'business';

export interface NavItem {
    id: SectionId;
    label: string;
    count?: number;
}

export interface CurrentBusinessUser {
    name: string;
    initials: string;
    imageUrl?: string;
}
