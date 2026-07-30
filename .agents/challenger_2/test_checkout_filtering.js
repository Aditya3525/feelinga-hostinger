// Harness 1: Empirical test for checkout/page.tsx orderableItems filtering
// Verifies filtering with numeric integer IDs ("1", "2", 1, 2, "0", 0, "", null, undefined)

const assert = require('assert');

// Simulate the item type and checkout filtering logic from checkout/page.tsx
function filterOrderableItems(checkoutItems) {
    // Exact code from checkout/page.tsx line 313:
    // const orderableItems = checkoutItems.filter(item => Boolean(item.id));
    const orderableItems = checkoutItems.filter(item => Boolean(item.id));
    
    // Exact code from checkout/page.tsx lines 323-327:
    const payloadItems = orderableItems.map(item => ({
        productId: item.id,
        size: item.size || '100g',
        qty: item.qty,
    }));

    return { orderableItems, payloadItems };
}

console.log('=== RUNNING EMPIRICAL TEST: Checkout page orderableItems filtering ===\n');

// Test Case 1: Standard numeric integer string IDs ("1", "2")
const test1Items = [
    { key: '1_100g', id: '1', name: 'Darjeeling Black Tea', price: 299, size: '100g', qty: 1 },
    { key: '2_100g', id: '2', name: 'Assam Green Tea', price: 349, size: '100g', qty: 2 },
];
const result1 = filterOrderableItems(test1Items);
console.log('Test 1 (Numeric string IDs "1", "2"):');
console.log('  Input count:', test1Items.length);
console.log('  Filtered count:', result1.orderableItems.length);
console.log('  Payload:', JSON.stringify(result1.payloadItems));
assert.strictEqual(result1.orderableItems.length, 2, 'Numeric string IDs "1", "2" MUST both pass filter');
assert.strictEqual(result1.payloadItems[0].productId, '1');
assert.strictEqual(result1.payloadItems[1].productId, '2');
console.log('  => PASS\n');

// Test Case 2: Numeric numbers (1, 2)
const test2Items = [
    { key: '1_100g', id: 1, name: 'Darjeeling Black Tea', price: 299, size: '100g', qty: 1 },
    { key: '2_100g', id: 2, name: 'Assam Green Tea', price: 349, size: '100g', qty: 2 },
];
const result2 = filterOrderableItems(test2Items);
console.log('Test 2 (Numeric integer numbers 1, 2):');
console.log('  Input count:', test2Items.length);
console.log('  Filtered count:', result2.orderableItems.length);
assert.strictEqual(result2.orderableItems.length, 2, 'Numeric integer numbers 1, 2 MUST both pass filter');
console.log('  => PASS\n');

// Test Case 3: Mixed items with invalid / empty IDs ("", null, undefined)
const test3Items = [
    { key: '1_100g', id: '1', name: 'Valid Item 1', price: 299, size: '100g', qty: 1 },
    { key: 'empty_100g', id: '', name: 'Empty ID Item', price: 100, size: '100g', qty: 1 },
    { key: 'null_100g', id: null, name: 'Null ID Item', price: 100, size: '100g', qty: 1 },
    { key: 'undef_100g', id: undefined, name: 'Undefined ID Item', price: 100, size: '100g', qty: 1 },
    { key: '2_100g', id: '2', name: 'Valid Item 2', price: 349, size: '100g', qty: 2 },
];
const result3 = filterOrderableItems(test3Items);
console.log('Test 3 (Mixed valid and invalid IDs):');
console.log('  Input count:', test3Items.length);
console.log('  Filtered count:', result3.orderableItems.length);
console.log('  Filtered item names:', result3.orderableItems.map(i => i.name));
assert.strictEqual(result3.orderableItems.length, 2, 'Only items with truthy IDs ("1", "2") must pass');
assert.deepStrictEqual(result3.orderableItems.map(i => i.id), ['1', '2']);
console.log('  => PASS\n');

// Test Case 4: Edge Case - Numeric ID 0 or string "0"
const test4Items = [
    { key: '0_100g', id: '0', name: 'String Zero ID Item', price: 100, size: '100g', qty: 1 },
    { key: '0_num', id: 0, name: 'Numeric Zero ID Item', price: 100, size: '100g', qty: 1 },
];
const result4 = filterOrderableItems(test4Items);
console.log('Test 4 (Edge case: String "0" vs Numeric 0):');
console.log('  Boolean("0") ->', Boolean('0')); // true
console.log('  Boolean(0) ->', Boolean(0));     // false
console.log('  Filtered count:', result4.orderableItems.length);
console.log('  Passed IDs:', result4.orderableItems.map(i => i.id));
assert.strictEqual(result4.orderableItems.length, 1, 'String "0" is truthy, numeric 0 is falsy');
console.log('  => OBSERVED: Boolean("0") passes, but numeric 0 gets filtered out.\n');

console.log('=== SUMMARY: Checkout filtering verification completed successfully ===');
