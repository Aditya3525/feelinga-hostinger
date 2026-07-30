import '../../styles/admin.css';
import type { AppProviderProps } from '../../types/app';

export const metadata = {
    title: 'Admin Dashboard',
    description: 'Feelinga admin dashboard — manage products, orders, users, and more.',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: AppProviderProps) {
    return <section className="admin-route-shell">{children}</section>;
}
