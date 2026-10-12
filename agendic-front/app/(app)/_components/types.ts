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
    /** Sub-ítems del sidebar; el ítem sigue yendo a su `href`. */
    children?: { href: string; label: string }[];
}

export interface CurrentBusinessUser {
    name: string;
    email: string;
    initials: string;
    imageUrl?: string;
}
