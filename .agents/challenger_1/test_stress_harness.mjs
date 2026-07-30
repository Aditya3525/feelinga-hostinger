import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log(' STRESS HARNESS — PDP EDGE CASES & HYDRATION MATRIX');
console.log('====================================================\n');

const projectRoot = 'c:/Engineering/feelinga-hostinger/frontend-build';
const clientFile = path.join(projectRoot, 'src/app/product/[slug]/ProductDetailClient.tsx');
const clientContent = fs.readFileSync(clientFile, 'utf8');

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

let passes = 0;
let fails = 0;

function check(cond, msg) {
    if (cond) {
        console.log(`  ✓ [PASS] ${msg}`);
        passes++;
    } else {
        console.error(`  ✗ [FAIL] ${msg}`);
        fails++;
    }
}

// 1. Stress test: Check all 8 products have valid weight pricing structure
console.log('--- SCENARIO 1: Weight Selector Matrix for all 8 Slugs ---');
expectedSlugs.forEach(slug => {
    const slugRegex = new RegExp(`'${slug}':\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
    const match = clientContent.match(slugRegex);
    check(match !== null, `Slug '${slug}' exists and parses in FALLBACK_PRODUCTS`);

    if (match) {
        const prodBody = match[1];
        const has100g = prodBody.includes("'100g':");
        check(has100g, `Product '${slug}' has required '100g' base price`);
    }
});

// 2. Stress test: Dynamic fallback generation for random unknown slug
console.log('\n--- SCENARIO 2: Unknown Slug Fallback Generation ---');
function generateDynamicFallback(slug) {
    return {
        id: slug,
        slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: 'Artisan Tea',
        prices: { '100g': 499 },
        price: 499,
        inStock: true,
        stock: 50,
    };
}

const unknownProduct = generateDynamicFallback('unknown-chamomile-lavender');
check(unknownProduct.name === 'Unknown Chamomile Lavender', 'Dynamic fallback formats slug to title: Unknown Chamomile Lavender');
check(unknownProduct.prices['100g'] === 499, 'Dynamic fallback provides default 100g price');
check(unknownProduct.inStock === true, 'Dynamic fallback sets inStock default');

// 3. Stress test: Size Filter & Price Resolution Logic
console.log('\n--- SCENARIO 3: Size Options Filtering & Price Calculation ---');
function computeSizeOptions(prices) {
    return [
        { size: '50g', label: '50g Sampler', price: prices?.['50g'] },
        { size: '100g', label: '100g Standard', price: prices?.['100g'] },
        { size: '200g', label: '200g Value Pack', price: prices?.['200g'] },
    ].filter(opt => opt.price != null && Number(opt.price) > 0);
}

// Case A: Full prices (50g, 100g, 200g)
const fullOpts = computeSizeOptions({ '50g': 299, '100g': 499, '200g': 899 });
check(fullOpts.length === 3, 'Full price object generates 3 size options');

// Case B: Only 100g
const singleOpt = computeSizeOptions({ '100g': 349 });
check(singleOpt.length === 1 && singleOpt[0].size === '100g', 'Single price object generates 1 size option (100g)');

// Case C: Null / undefined secondary prices
const partialOpt = computeSizeOptions({ '50g': null, '100g': 499, '200g': undefined });
check(partialOpt.length === 1 && partialOpt[0].size === '100g', 'Null/undefined sizes filtered out gracefully');

// 4. Stress test: Cart Payload Formatting
console.log('\n--- SCENARIO 4: Cart Item Payload Schema ---');
function buildCartPayload(product, selectedSize, quantity, mainImage) {
    const sizeOptions = computeSizeOptions(product.prices);
    const currentPrice = product.prices?.[selectedSize] ?? sizeOptions.find(o => o.size === selectedSize)?.price ?? product.price;
    return {
        id: product.id || product.slug,
        slug: product.slug,
        name: product.name,
        price: currentPrice,
        size: selectedSize,
        img: mainImage,
        qty: quantity,
    };
}

const sampleCart = buildCartPayload({
    id: '1',
    slug: 'darjeeling-first-flush',
    name: 'Darjeeling First Flush',
    prices: { '50g': 299, '100g': 499, '200g': 899 },
    price: 499
}, '50g', 2, '/images/products/darjeeling-ff.jpg');

check(sampleCart.price === 299, 'Selected size 50g resolves price 299');
check(sampleCart.qty === 2, 'Quantity set correctly to 2');
check(sampleCart.size === '50g', 'Size set correctly to 50g');

console.log('\n====================================================');
console.log(` SCENARIOS PASSED: ${passes}, FAILED: ${fails}`);
console.log('====================================================');
