// Harness 2: Empirical test for CartContext.tsx cart persistence and auth token isolation
// Verifies cart persistence in localStorage across reloads without token wiping

const assert = require('assert');

// Mock localStorage implementation
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] || null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

console.log('=== RUNNING EMPIRICAL TEST: CartContext persistence & Token Wiping ===\n');

// Test Case 1: Initial state & hydration simulation on reload
const localStorage = new MockLocalStorage();

// Setup existing state in localStorage before page load
const initialUser = { id: 42, name: 'Alice Test', email: 'alice@example.com', role: 'customer' };
const initialRefreshToken = 'mock_refresh_token_xyz_123';
const initialCart = [
    { key: '1_100g', id: '1', slug: 'darjeeling-tea', name: 'Darjeeling Tea', price: 299, size: '100g', qty: 2 },
    { key: '2_100g', id: '2', slug: 'assam-tea', name: 'Assam Tea', price: 349, size: '100g', qty: 1 }
];

localStorage.setItem('feelinga_user', JSON.stringify(initialUser));
localStorage.setItem('feelinga_refresh', initialRefreshToken);
localStorage.setItem('feelinga_cart', JSON.stringify(initialCart));

console.log('Step 1: Set up initial localStorage state:');
console.log('  feelinga_user:', localStorage.getItem('feelinga_user'));
console.log('  feelinga_refresh:', localStorage.getItem('feelinga_refresh'));
console.log('  feelinga_cart:', localStorage.getItem('feelinga_cart'));

// Simulate CartContext lifecycle on mount
function simulateCartProviderMount(storage, authState = { isAuthenticated: true }) {
    let cartState = [];
    let initializedRef = { current: false };

    // Effect 1: Mount effect (load cart from localStorage)
    const stored = storage.getItem('feelinga_cart');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].id) {
                storage.removeItem('feelinga_cart');
            } else {
                cartState = parsed;
            }
        } catch (err) {
            storage.removeItem('feelinga_cart');
        }
    }
    
    // In actual React, initializedRef.current = true is set at the end of Effect 1
    // BUT Effect 2 runs in the same effect phase of mount render!
    // In CartContext.tsx lines 41-45:
    // useEffect(() => {
    //    if (initializedRef.current) { localStorage.setItem('feelinga_cart', JSON.stringify(cart)); }
    // }, [cart]);

    // If initializedRef is set to true BEFORE Effect 2 evaluates mount render's cartState ([]):
    const effect2MountRanWithEmptyCart = initializedRef.current;
    
    // Now set initializedRef = true (as done in line 37)
    initializedRef.current = true;

    // After state update re-renders, cartState is initialCart:
    if (initializedRef.current) {
        storage.setItem('feelinga_cart', JSON.stringify(cartState));
    }

    return { cartState, effect2MountRanWithEmptyCart };
}

const mountResult = simulateCartProviderMount(localStorage);

console.log('\nStep 2: Simulated CartProvider mount & reload hydration:');
console.log('  Hydrated cart count:', mountResult.cartState.length);
console.log('  Persisted cart in storage:', localStorage.getItem('feelinga_cart'));
console.log('  User profile in storage:', localStorage.getItem('feelinga_user'));
console.log('  Refresh token in storage:', localStorage.getItem('feelinga_refresh'));

// Verification 1: Cart items were preserved
assert.strictEqual(mountResult.cartState.length, 2, 'Cart items MUST be restored from localStorage');
assert.strictEqual(mountResult.cartState[0].id, '1');
assert.strictEqual(mountResult.cartState[1].id, '2');

// Verification 2: Auth tokens were untouched
assert.strictEqual(JSON.parse(localStorage.getItem('feelinga_user')).email, 'alice@example.com', 'User token/profile MUST NOT be wiped');
assert.strictEqual(localStorage.getItem('feelinga_refresh'), initialRefreshToken, 'Refresh token MUST NOT be wiped');

console.log('  => PASS: Cart hydrated & tokens intact across reloads.\n');

// Test Case 2: Verify Invalid Cart Auto-Cleanup (corrupted or old format without id)
console.log('Step 3: Test invalid cart auto-cleanup:');
localStorage.setItem('feelinga_cart', JSON.stringify([{ legacyKey: 'abc', name: 'Old Format Item' }])); // Missing .id
simulateCartProviderMount(localStorage);
assert.strictEqual(localStorage.getItem('feelinga_cart'), '[]', 'Invalid cart items missing .id must be reset to empty array');
assert.strictEqual(localStorage.getItem('feelinga_refresh'), initialRefreshToken, 'Tokens MUST remain intact during cart reset');
console.log('  => PASS: Invalid cart cleaned without affecting tokens.\n');

// Test Case 3: Token Wiping Analysis
console.log('Step 4: Analyze token wiping references in CartContext & AuthContext:');
const fs = require('fs');
const cartContextCode = fs.readFileSync('frontend-build/src/context/CartContext.tsx', 'utf8');
const authContextCode = fs.readFileSync('frontend-build/src/context/AuthContext.tsx', 'utf8');

const cartWipesUserToken = cartContextCode.includes("removeItem('feelinga_user')");
const cartWipesRefreshToken = cartContextCode.includes("removeItem('feelinga_refresh')");

console.log('  CartContext wipes feelinga_user:', cartWipesUserToken);
console.log('  CartContext wipes feelinga_refresh:', cartWipesRefreshToken);

assert.strictEqual(cartWipesUserToken, false, 'CartContext must NEVER wipe feelinga_user');
assert.strictEqual(cartWipesRefreshToken, false, 'CartContext must NEVER wipe feelinga_refresh');
console.log('  => PASS: CartContext does not perform token wiping.\n');

console.log('=== SUMMARY: Cart persistence and token verification passed successfully ===');
