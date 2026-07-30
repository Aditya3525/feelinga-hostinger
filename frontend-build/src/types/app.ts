import type { Dispatch, ReactNode, SetStateAction } from 'react';

export interface AppProviderProps {
    children: ReactNode;
}

export interface UserAddress {
    _id?: string;
    label: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault?: boolean;
}

export interface UserProfile {
    _id?: string;
    name: string;
    email: string;
    phone?: string;
    role?: 'admin' | 'customer' | string;
    addresses?: UserAddress[];
}

export interface AuthContextValue {
    user: UserProfile | null;
    setUser: Dispatch<SetStateAction<UserProfile | null>>;
    isAuthenticated: boolean;
    isAdmin: boolean;
    authReady: boolean;
    showAuthModal: boolean;
    login: (email: string, password: string) => Promise<any>;
    register: (name: string, email: string, password: string) => Promise<any>;
    googleLogin: (credential: string) => Promise<any>;
    logout: () => Promise<void>;
    updateProfile: (updates: Record<string, unknown>) => Promise<any>;
    openAuthModal: () => void;
    closeAuthModal: () => void;
}

export interface CartItem {
    key: string;
    id: string;
    slug?: string;
    name: string;
    price: number;
    size: string;
    img?: string;
    qty: number;
    cartItemId?: string;
}

export interface AddToCartInput {
    id: string;
    slug?: string;
    name: string;
    price: number;
    size?: string;
    img?: string;
    qty?: number;
}

export interface CartContextValue {
    cart: CartItem[];
    cartOpen: boolean;
    setCartOpen: Dispatch<SetStateAction<boolean>>;
    addToCart: (item: AddToCartInput) => Promise<void>;
    removeFromCart: (key: string) => Promise<void>;
    updateQty: (key: string, qty: number) => Promise<void>;
    clearCart: () => Promise<void>;
    itemCount: number;
    subtotal: number;
    shipping: number;
    syncCartOnLogin: () => Promise<void>;
    fetchServerCart: () => Promise<void>;
    syncing: boolean;
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
    theme: ThemeMode;
    toggleTheme: () => void;
}

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    img?: string;
}

export interface ToastContextValue {
    showToast: (message: string, type?: ToastType, img?: string) => void;
}

export interface ProductSearchResult {
    _id: string;
    slug: string;
    name: string;
    type?: string;
    images?: string[];
    prices?: Record<string, number>;
    price?: number;
}

export interface OrderItem {
    id?: string;
    productId?: string;
    product?: {
        slug?: string;
        images?: string[];
    } | string;
    name: string;
    size: string;
    qty: number;
    price: number;
    image?: string;
}

export interface OrderShippingAddress {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
}

export interface OrderSummary {
    _id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    total: number;
    items?: OrderItem[];
}

export interface OrderDetail extends OrderSummary {
    subtotal?: number;
    discount?: number;
    couponCode?: string;
    shipping?: number;
    tax?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    notes?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippingAddress?: OrderShippingAddress;
}
