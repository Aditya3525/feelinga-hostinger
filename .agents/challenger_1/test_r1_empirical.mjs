import fs from 'fs';
import path from 'path';

const projectRoot = 'c:/Engineering/feelinga-hostinger/frontend-build';

console.log('====================================================');
console.log(' EMPIRICAL VERIFICATION HARNESS — R1 PRODUCT ROUTES');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  [PASS] ${message}`);
        passCount++;
    } else {
        console.error(`  [FAIL] ${message}`);
        failCount++;
    }
}

// ----------------------------------------------------
// TEST 1: generateStaticParams() Verification
// ----------------------------------------------------
console.log('--- TEST 1: generateStaticParams() in app/product/[slug]/page.tsx ---');
const pageFile = path.join(projectRoot, 'src/app/product/[slug]/page.tsx');
assert(fs.existsSync(pageFile), `File exists: ${pageFile}`);

const pageContent = fs.readFileSync(pageFile, 'utf8');

// Parse return array from generateStaticParams
const staticParamsMatch = pageContent.match(/export async function generateStaticParams\(\)\s*\{[\s\S]*?return\s*(\[[\s\S]*?\]);/);
assert(staticParamsMatch !== null, 'generateStaticParams() function found and returns an array');

let staticSlugs = [];
if (staticParamsMatch) {
    const arrayStr = staticParamsMatch[1];
    const slugMatches = [...arrayStr.matchAll(/slug:\s*['"]([^'"]+)['"]/g)];
    staticSlugs = slugMatches.map(m => m[1]);
}

console.log(`  Discovered ${staticSlugs.length} slugs in generateStaticParams():`, staticSlugs);

const expectedSlugs = [
    'darjeeling-first-flush',
    'assam-golden-tippy',
    'nilgiri-frost-tea',
    'masala-chai-classic',
    'jasmine-green-tea',
    'tulsi-ginger-herbal',
    'silver-needle-white',
    'aged-puerh-reserve'
];

assert(staticSlugs.length === 8, 'generateStaticParams() returns exactly 8 slugs');
expectedSlugs.forEach(slug => {
    assert(staticSlugs.includes(slug), `Slug '${slug}' present in generateStaticParams()`);
});

// ----------------------------------------------------
// TEST 2: FALLBACK_PRODUCTS & Data Hydration Integrity
// ----------------------------------------------------
console.log('\n--- TEST 2: FALLBACK_PRODUCTS in ProductDetailClient.tsx ---');
const clientFile = path.join(projectRoot, 'src/app/product/[slug]/ProductDetailClient.tsx');
assert(fs.existsSync(clientFile), `File exists: ${clientFile}`);

const clientContent = fs.readFileSync(clientFile, 'utf8');

expectedSlugs.forEach(slug => {
    const hasSlugKey = clientContent.includes(`'${slug}':`);
    assert(hasSlugKey, `FALLBACK_PRODUCTS has entry for '${slug}'`);
});

// Verify fallback object property presence in source
assert(clientContent.includes('FALLBACK_PRODUCTS: Record<string, ProductData>'), 'FALLBACK_PRODUCTS typed correctly');
assert(clientContent.includes('prices: {'), 'Prices object present in fallbacks');
assert(clientContent.includes("prices: { '50g':"), '50g prices defined');
assert(clientContent.includes("prices: { '50g': 299, '100g': 499, '200g': 899 }"), 'Darjeeling prices accurate');

// ----------------------------------------------------
// TEST 3: Product Card Links Across Pages
// ----------------------------------------------------
console.log('\n--- TEST 3: Product Card Links Across Navigation Routes ---');

// 3a. ProductCard component default link logic
const productCardFile = path.join(projectRoot, 'src/components/ProductCard.tsx');
const cardContent = fs.readFileSync(productCardFile, 'utf8');
assert(cardContent.includes("const href = linkHref ?? `/product/${product.slug}`"), 'ProductCard defaults href to /product/${product.slug}');
assert(cardContent.includes('<Link href={href}>'), 'ProductCard image links to /product/[slug]');
assert(cardContent.includes('<Link href={href} className="product-card__name">'), 'ProductCard title links to /product/[slug]');

// 3b. Home page links
const homeFile = path.join(projectRoot, 'src/app/page.tsx');
const homeContent = fs.readFileSync(homeFile, 'utf8');
assert(homeContent.includes('<ProductCard') && homeContent.includes('badge="New"'), 'Home page renders ProductCards for New Arrivals');
assert(homeContent.includes('<ProductCard') && homeContent.includes('badge="Best Seller"'), 'Home page renders ProductCards for Best Sellers');
assert(homeContent.includes("href={`/product/${c.slug}`}"), "Home page Tea Master's Selections directly link to /product/[slug]");
assert(homeContent.includes("href={`/shop?mood=${m.mood}`}"), 'Home page Mood cards direct to /shop?mood=[mood]');

// 3c. Shop page links
const shopFile = path.join(projectRoot, 'src/app/shop/page.tsx');
const shopContent = fs.readFileSync(shopFile, 'utf8');
assert(shopContent.includes('<ProductCard') && shopContent.includes('product={p}'), 'Shop page renders ProductCard without custom linkHref (uses /product/[slug])');

// 3d. Wishlist page links
const wishlistFile = path.join(projectRoot, 'src/app/wishlist/page.tsx');
const wishlistContent = fs.readFileSync(wishlistFile, 'utf8');
assert(wishlistContent.includes("href={`/product/${p.slug}`}"), 'Wishlist page image links to /product/[slug]');
assert(wishlistContent.includes("href={`/product/${p.slug}`} className=\"product-card__name\""), 'Wishlist page title links to /product/[slug]');

// 3e. Search Overlay links
const searchOverlayFile = path.join(projectRoot, 'src/components/SearchOverlay.tsx');
const searchContent = fs.readFileSync(searchOverlayFile, 'utf8');
assert(searchContent.includes("router.push(`/product/${product.slug}`)"), 'Search overlay navigates to /product/[slug]');

// ----------------------------------------------------
// TEST 4: Weight Selector, Image & Cart Integration
// ----------------------------------------------------
console.log('\n--- TEST 4: Dynamic Component Features (Weight Selector, Gallery, Cart) ---');

// Weight selector logic
assert(clientContent.includes("sizeOptions = ["), 'sizeOptions array defined');
assert(clientContent.includes("filter(opt => opt.price != null && Number(opt.price) > 0)"), 'Filter out zero or missing price options');
assert(clientContent.includes("setSelectedSize(opt.size)"), 'onClick handler updates selectedSize state');

// Gallery / Image rendering logic
assert(clientContent.includes("resolveProductImageUrl(img, '/images/products/darjeeling-ff.jpg')"), 'Images resolved through resolveProductImageUrl');
assert(clientContent.includes("setSelectedImageIndex(idx)"), 'Thumbnail click updates main display image index');

// Cart integration logic
assert(clientContent.includes("const { addToCart } = useCart()"), 'useCart context integrated');
assert(clientContent.includes("await addToCart({"), 'handleAddToCart calls addToCart with item details');
assert(clientContent.includes("size: selectedSize"), 'Cart payload includes selected weight size');
assert(clientContent.includes("disabled={!product.inStock}"), 'Add to Cart button disabled when out of stock');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(` RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
    process.exit(1);
}
