import { redirect } from 'next/navigation';

// Redirect bare /product to /shop — individual products use /product/[slug]
export default function ProductRedirect() {
    redirect('/shop');
}



