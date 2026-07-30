import ProductDetailClient from './ProductDetailClient';

export async function generateStaticParams() {
    return [
        { slug: 'darjeeling-first-flush' },
        { slug: 'assam-golden-tippy' },
        { slug: 'nilgiri-frost-tea' },
        { slug: 'masala-chai-classic' },
        { slug: 'jasmine-green-tea' },
        { slug: 'tulsi-ginger-herbal' },
        { slug: 'silver-needle-white' },
        { slug: 'aged-puerh-reserve' },
    ];
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
    const resolvedParams = await params;
    return <ProductDetailClient slug={resolvedParams.slug} />;
}
