import type { AppProviderProps } from '../../types/app';

export const metadata = {
    title: 'My Wishlist',
    description: 'Your saved favourite teas from Feelinga. View and manage your wishlist.',
};

export default function WishlistLayout({ children }: AppProviderProps) {
    return children;
}
