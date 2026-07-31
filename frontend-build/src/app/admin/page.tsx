'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../components/Toast';
import AppIcon from '../../components/AppIcon';
import { resolveProductImageList, resolveProductImageUrl } from '../../utils/image';
import {
    ActivityTab,
    CouponsTab,
    MessagesTab,
    NewsletterTab,
    OrdersTab,
    OverviewTab,
    ProductsTab,
    TestimonialsTab,
    UsersTab,
} from './components/TabSections';

type AdminRecord = Record<string, any>;
type AdminList = AdminRecord[];
type AdminPagination = {
    page: number;
    totalPages: number;
};
type AdminUserPagination = AdminPagination & {
    total: number;
};

type ConfirmDialogState = {
    title: string;
    message: string;
    confirmLabel: string;
    tone?: 'danger' | 'default';
    onConfirm: () => Promise<void> | void;
};

export default function Admin() {
    const { isAuthenticated, isAdmin, user, authReady, login: authLogin, logout } = useAuth();
    const { showToast } = useToast();
    const [currentUser, setCurrentUser] = useState<AdminRecord | null>(null);
    const [gateError, setGateError] = useState('');
    const [activeSection, setActiveSection] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Dashboard data
    const [overview, setOverview] = useState<AdminRecord | null>(null);
    const [products, setProducts] = useState<AdminList>([]);
    const [productPagination, setProductPagination] = useState<AdminPagination>({ page: 1, totalPages: 1 });
    const [orders, setOrders] = useState<AdminList>([]);
    const [orderPagination, setOrderPagination] = useState<AdminPagination>({ page: 1, totalPages: 1 });
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState('');
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [activity, setActivity] = useState<AdminList>([]);

    // Users state
    const [users, setUsers] = useState<AdminList>([]);
    const [userPagination, setUserPagination] = useState<AdminUserPagination>({ page: 1, totalPages: 1, total: 0 });
    const [userSearch, setUserSearch] = useState('');

    // Low-stock alerts
    const [lowStockProducts, setLowStockProducts] = useState<AdminList>([]);

    // Messages (contact submissions)
    const [messages, setMessages] = useState<AdminList>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // Newsletter subscribers
    const [subscribers, setSubscribers] = useState<AdminList>([]);
    const [subscribersLoading, setSubscribersLoading] = useState(false);

    // Coupons
    const [coupons, setCoupons] = useState<AdminList>([]);
    const [couponsLoading, setCouponsLoading] = useState(false);
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<AdminRecord | null>(null);
    const emptyCoupon: AdminRecord = {
        name: '',
        code: '',
        campaignType: 'regular',
        campaignLabel: '',
        bannerText: '',
        featuredOnStore: false,
        priority: 0,
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: '',
        maxDiscount: '',
        usageLimit: '',
        perUserLimit: '',
        validFrom: '',
        validTo: '',
        active: true,
    };
    const [couponForm, setCouponForm] = useState<AdminRecord>(emptyCoupon);

    // Testimonials
    const [testimonials, setTestimonials] = useState<AdminList>([]);
    const [testimonialsLoading, setTestimonialsLoading] = useState(false);
    const [showTestimonialForm, setShowTestimonialForm] = useState(false);
    const [editingTestimonial, setEditingTestimonial] = useState<AdminRecord | null>(null);
    const emptyTestimonial: AdminRecord = { author: '', role: '', text: '', rating: 5, approved: false, featured: false, order: 0 };
    const [testimonialForm, setTestimonialForm] = useState<AdminRecord>(emptyTestimonial);

    // Product form state
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<AdminRecord | null>(null);
    const emptyProduct: AdminRecord = {
        name: '', slug: '', type: 'Black Tea', description: '', shortDescription: '', origin: 'Unknown',
        sizes: [{ weight: '100g', price: '' }],
        stock: 100, caffeine: 'medium', tastingNotes: '', tags: '', images: [] as string[],
        isBestSeller: false, isNewArrival: true, inStock: true,
        brewTemp: '', brewSteep: '', brewAmount: '',
    };
    const [productForm, setProductForm] = useState<AdminRecord>(emptyProduct);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Admin login for non-authenticated users
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [tabErrors, setTabErrors] = useState<Record<string, string>>({});
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    const clearTabError = useCallback((tab: string) => {
        setTabErrors((prev) => {
            if (!prev[tab]) return prev;
            const next = { ...prev };
            delete next[tab];
            return next;
        });
    }, []);

    const setTabError = useCallback((tab: string, message: string) => {
        setTabErrors((prev) => ({ ...prev, [tab]: message }));
    }, []);

    useEffect(() => {
        if (!confirmDialog) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        confirmButtonRef.current?.focus();

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !confirmLoading) {
                setConfirmDialog(null);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [confirmDialog, confirmLoading]);

    const requestConfirmation = useCallback((dialog: ConfirmDialogState) => {
        setConfirmDialog(dialog);
    }, []);

    const runConfirmedAction = useCallback(async () => {
        if (!confirmDialog) return;
        setConfirmLoading(true);
        try {
            await confirmDialog.onConfirm();
            setConfirmDialog(null);
        } finally {
            setConfirmLoading(false);
        }
    }, [confirmDialog]);

    const adminApi = useCallback(async (path: string, options: Record<string, unknown> = {}): Promise<any> => {
        return apiRequest(path, options);
    }, []);

    const notifyCampaignRefresh = useCallback(() => {
        window.dispatchEvent(new Event('campaign:refresh'));
    }, []);

    // Sync admin currentUser with AuthContext — single source of truth
    // Wait for authReady so we don't fire API calls with a stale/expired token
    useEffect(() => {
        if (!authReady) return;
        if (isAdmin && user) {
            setCurrentUser(user);
        } else {
            // Not authenticated OR not admin — show login gate
            setCurrentUser(null);
        }
    }, [authReady, isAuthenticated, isAdmin, user]);

    const handleAdminLogin = async (e: any) => {
        e.preventDefault();
        setGateError('');
        try {
            const data = await authLogin(loginEmail, loginPassword);
            if (data.data.user.role !== 'admin') throw new Error('Admin access required');
            setCurrentUser(data.data.user);
        } catch (err: any) {
            setGateError(err.message);
        }
    };

    // Load only overview data when we have an admin user
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!currentUser) return;
        loadOverview();
        loadLowStock();
    }, [currentUser]);

    // Lazy-load tab data when tab changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!currentUser) return;
        if (activeSection === 'products') loadProducts();
        else if (activeSection === 'orders') loadOrders();
        else if (activeSection === 'users') loadUsers();
        else if (activeSection === 'activity') loadActivity();
        else if (activeSection === 'messages') loadMessages();
        else if (activeSection === 'newsletter') loadSubscribers();
        else if (activeSection === 'coupons') loadCoupons();
        else if (activeSection === 'testimonials') loadTestimonials();
    }, [activeSection, currentUser]);

    const loadOverview = async () => {
        try {
            clearTabError('overview');
            const data = await adminApi('/admin/dashboard');
            setOverview(data.data);
        } catch (err) {
            console.error(err);
            setTabError('overview', 'Dashboard data could not be loaded.');
        }
    };

    const loadProducts = async (page = 1) => {
        try {
            clearTabError('products');
            const data = await adminApi(`/products?page=${page}&limit=10`);
            setProducts(data.data || []);
            setProductPagination(data.pagination || { page: 1, totalPages: 1 });
        } catch (err) {
            console.error(err);
            setTabError('products', 'Products could not be loaded.');
        }
    };

    const loadOrders = async (page = 1, search = orderSearch, status = orderStatusFilter) => {
        try {
            clearTabError('orders');
            let url = `/orders?page=${page}&limit=10`;
            if (search) url += `&q=${encodeURIComponent(search)}`;
            if (status) url += `&status=${status}`;
            const data = await adminApi(url);
            setOrders(data.data || []);
            setOrderPagination(data.pagination || { page: 1, totalPages: 1 });
            setSelectedOrders([]); // Clear selections on reload
        } catch (err) {
            console.error(err);
            setTabError('orders', 'Orders could not be loaded.');
        }
    };

    const loadActivity = async () => {
        try {
            clearTabError('activity');
            const data = await adminApi('/admin/activity');
            setActivity(data.data || []);
        } catch (err) {
            console.error(err);
            setTabError('activity', 'Activity feed could not be loaded.');
        }
    };

    const loadUsers = async (page = 1, search = '') => {
        try {
            clearTabError('users');
            const data = await adminApi(`/admin/users?page=${page}&limit=20${search ? `&q=${encodeURIComponent(search)}` : ''}`);
            setUsers(data.data || []);
            setUserPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            console.error(err);
            setTabError('users', 'Users could not be loaded.');
        }
    };

    const loadLowStock = async () => {
        try {
            clearTabError('overview');
            const data = await adminApi('/admin/low-stock?threshold=10');
            setLowStockProducts(data.data || []);
        } catch (err) {
            console.error(err);
            setTabError('overview', 'Low-stock alerts could not be loaded.');
        }
    };

    const loadMessages = async () => {
        setMessagesLoading(true);
        try {
            clearTabError('messages');
            const data = await adminApi('/contact');
            setMessages(data.data || []);
        } catch (err) {
            console.error(err);
            setTabError('messages', 'Messages could not be loaded.');
        }
        finally { setMessagesLoading(false); }
    };

    const loadSubscribers = async () => {
        setSubscribersLoading(true);
        try {
            clearTabError('newsletter');
            const data = await adminApi('/newsletter');
            setSubscribers(data.data || []);
        } catch (err) {
            console.error(err);
            setTabError('newsletter', 'Subscribers could not be loaded.');
        }
        finally { setSubscribersLoading(false); }
    };

    const loadCoupons = async () => {
        setCouponsLoading(true);
        try {
            clearTabError('coupons');
            const data = await adminApi('/admin/coupons');
            setCoupons(data.data || []);
        } catch (err) {
            console.error(err);
            setTabError('coupons', 'Coupons could not be loaded.');
        }
        finally { setCouponsLoading(false); }
    };

    const loadTestimonials = async () => {
        setTestimonialsLoading(true);
        try {
            clearTabError('testimonials');
            const data = await adminApi('/admin/testimonials');
            setTestimonials(data.data || []);
        } catch (err) {
            console.error(err);
            setTabError('testimonials', 'Reviews could not be loaded.');
        }
        finally { setTestimonialsLoading(false); }
    };

    const handleTestimonialSubmit = async (e: any) => {
        e.preventDefault();
        const body = {
            author: testimonialForm.author.trim(),
            role: testimonialForm.role.trim() || 'Customer',
            text: testimonialForm.text.trim(),
            rating: Number(testimonialForm.rating),
            approved: testimonialForm.approved,
            featured: testimonialForm.featured,
            order: Number(testimonialForm.order) || 0,
        };
        try {
            if (editingTestimonial) {
                await adminApi(`/admin/testimonials/${editingTestimonial._id}`, { method: 'PATCH', body: JSON.stringify(body) });
            } else {
                await adminApi('/admin/testimonials', { method: 'POST', body: JSON.stringify(body) });
            }
            setShowTestimonialForm(false);
            setEditingTestimonial(null);
            setTestimonialForm(emptyTestimonial);
            loadTestimonials();
        } catch (err: any) { showToast(err.message || 'Failed to save testimonial', 'error'); }
    };

    const deleteTestimonial = async (id: string) => {
        requestConfirmation({
            title: 'Delete review?',
            message: 'This review will be permanently removed from admin and storefront listings.',
            confirmLabel: 'Delete review',
            tone: 'danger',
            onConfirm: async () => {
                try {
                    await adminApi(`/admin/testimonials/${id}`, { method: 'DELETE' });
                    loadTestimonials();
                } catch (err: any) {
                    showToast(err.message || 'Failed to delete testimonial', 'error');
                }
            },
        });
    };

    const toggleTestimonialApproval = async (testimonial: AdminRecord) => {
        try {
            await adminApi(`/admin/testimonials/${testimonial._id}`, {
                method: 'PATCH',
                body: JSON.stringify({ approved: !testimonial.approved }),
            });
            loadTestimonials();
        } catch (err: any) { showToast(err.message || 'Failed to update testimonial', 'error'); }
    };

    const toggleTestimonialFeatured = async (testimonial: AdminRecord) => {
        try {
            await adminApi(`/admin/testimonials/${testimonial._id}`, {
                method: 'PATCH',
                body: JSON.stringify({ featured: !testimonial.featured }),
            });
            loadTestimonials();
        } catch (err: any) { showToast(err.message || 'Failed to update testimonial', 'error'); }
    };

    const openEditTestimonial = (t: AdminRecord) => {
        setEditingTestimonial(t);
        setTestimonialForm({
            author: t.author || '',
            role: t.role || '',
            text: t.text || '',
            rating: t.rating || 5,
            approved: t.approved || false,
            featured: t.featured || false,
            order: t.order || 0,
        });
        setShowTestimonialForm(true);
    };

    const handleCouponSubmit = async (e: any) => {
        e.preventDefault();
        const body = {
            name: couponForm.name?.trim() || undefined,
            code: couponForm.code.toUpperCase().trim(),
            campaignType: couponForm.campaignType || 'regular',
            campaignLabel: couponForm.campaignLabel?.trim() || undefined,
            bannerText: couponForm.bannerText?.trim() || undefined,
            featuredOnStore: !!couponForm.featuredOnStore,
            priority: Number(couponForm.priority || 0),
            discountType: couponForm.discountType,
            discountValue: Number(couponForm.discountValue),
            minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : undefined,
            maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : undefined,
            usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined,
            perUserLimit: couponForm.perUserLimit ? Number(couponForm.perUserLimit) : undefined,
            validFrom: couponForm.validFrom || undefined,
            validTo: couponForm.validTo || undefined,
            active: couponForm.active,
        };
        try {
            if (editingCoupon) {
                await adminApi(`/admin/coupons/${editingCoupon._id}`, { method: 'PATCH', body: JSON.stringify(body) });
            } else {
                await adminApi('/admin/coupons', { method: 'POST', body: JSON.stringify(body) });
            }
            setShowCouponForm(false);
            setEditingCoupon(null);
            setCouponForm(emptyCoupon);
            loadCoupons();
            notifyCampaignRefresh();
        } catch (err: any) { showToast(err.message || 'Failed to save coupon', 'error'); }
    };

    const deleteCoupon = async (id: string) => {
        requestConfirmation({
            title: 'Delete coupon?',
            message: 'This coupon will no longer be available for checkout.',
            confirmLabel: 'Delete coupon',
            tone: 'danger',
            onConfirm: async () => {
                try {
                    await adminApi(`/admin/coupons/${id}`, { method: 'DELETE' });
                    loadCoupons();
                    notifyCampaignRefresh();
                } catch (err: any) {
                    showToast(err.message || 'Failed to delete coupon', 'error');
                }
            },
        });
    };

    const openEditCoupon = (c: AdminRecord) => {
        setEditingCoupon(c);
        setCouponForm({
            name: c.name || '',
            code: c.code || '',
            campaignType: c.campaignType || 'regular',
            campaignLabel: c.campaignLabel || '',
            bannerText: c.bannerText || '',
            featuredOnStore: c.featuredOnStore || false,
            priority: c.priority || 0,
            discountType: c.discountType || 'percentage',
            discountValue: c.discountValue || '',
            minOrderAmount: c.minOrderAmount || '',
            maxDiscount: c.maxDiscount || '',
            usageLimit: c.usageLimit || '',
            perUserLimit: c.perUserLimit || '',
            validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
            validTo: c.validTo ? c.validTo.slice(0, 10) : '',
            active: c.active !== false,
        });
        setShowCouponForm(true);
    };

    const toggleCouponStatus = async (coupon: AdminRecord) => {
        const nextActive = !coupon.active;
        try {
            await adminApi(`/admin/coupons/${coupon._id}`, {
                method: 'PATCH',
                body: JSON.stringify({ active: nextActive }),
            });
            showToast(`Coupon ${nextActive ? 'enabled' : 'disabled'} successfully`, 'success');
            loadCoupons();
            notifyCampaignRefresh();
        } catch (err: any) {
            showToast(err.message || 'Failed to update coupon status', 'error');
        }
    };

    const changeUserRole = async (userId: string, newRole: string) => {
        requestConfirmation({
            title: 'Change user role?',
            message: `This will update the user role to "${newRole}" immediately.`,
            confirmLabel: `Set role: ${newRole}`,
            tone: 'default',
            onConfirm: async () => {
                setActionLoading(`role-${userId}`);
                try {
                    await adminApi(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
                    loadUsers(userPagination.page, userSearch);
                } catch (err: any) {
                    showToast(err.message || 'Failed to change role', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
        });
    };

    const exportCSV = async (type: string) => {
        setActionLoading(`export-${type}`);
        try {
            const userStr = localStorage.getItem('feelinga_user');
            if (!userStr) throw new Error('Not authenticated');
            const res = await fetch(`/api/v1/admin/export/${type}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) { showToast(err.message || 'Export failed', 'error'); }
        finally { setActionLoading(null); }
    };

    const downloadInvoice = async (orderId: string) => {
        setActionLoading(`invoice-${orderId}`);
        try {
            const userStr = localStorage.getItem('feelinga_user');
            if (!userStr) throw new Error('Not authenticated');
            const res = await fetch(`/api/v1/admin/invoice/${orderId}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Invoice generation failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${orderId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) { showToast(err.message || 'Failed to generate invoice', 'error'); }
        finally { setActionLoading(null); }
    };

    const updateOrderStatus = async (id: string, status: string) => {
        setActionLoading(`status-${id}`);
        try {
            await adminApi(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            loadOrders(orderPagination.page);
        } catch (err: any) { showToast(err.message || 'Failed to update status', 'error'); }
        finally { setActionLoading(null); }
    };

    const bulkUpdateStatus = async (status: string) => {
        if (selectedOrders.length === 0) return;
        setActionLoading('bulk-status');
        try {
            await adminApi('/orders/bulk-status', { method: 'PATCH', body: JSON.stringify({ ids: selectedOrders, status }) });
            setSelectedOrders([]);
            loadOrders(orderPagination.page);
            showToast(`Updated ${selectedOrders.length} orders to ${status}`, 'success');
        } catch (err: any) { showToast(err.message || 'Failed to bulk update status', 'error'); }
        finally { setActionLoading(null); }
    };

    const updateTracking = async (orderId: string, trackingNumber: string, trackingUrl: string) => {
        setActionLoading(`tracking-${orderId}`);
        try {
            await adminApi(`/admin/orders/${orderId}/tracking`, {
                method: 'PATCH',
                body: JSON.stringify({ trackingNumber, trackingUrl }),
            });
            loadOrders(orderPagination.page);
        } catch (err: any) { showToast(err.message || 'Failed to update tracking', 'error'); }
        finally { setActionLoading(null); }
    };

    const deleteProduct = async (id: string, name: string) => {
        requestConfirmation({
            title: 'Delete product?',
            message: `"${name}" will be removed from active listings and customer browsing.`,
            confirmLabel: 'Delete product',
            tone: 'danger',
            onConfirm: async () => {
                setActionLoading(`del-${id}`);
                try {
                    await adminApi(`/products/${id}`, { method: 'DELETE' });
                    loadProducts(productPagination.page);
                } catch (err: any) {
                    showToast(err.message || 'Failed to delete product', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
        });
    };

    const openCreateProduct = () => {
        setEditingProduct(null);
        setProductForm(emptyProduct);
        setShowProductForm(true);
    };

    const openEditProduct = (p: AdminRecord) => {
        setEditingProduct(p);
        setProductForm({
            name: p.name || '',
            slug: p.slug || '',
            type: p.type || 'Black Tea',
            description: p.description || '',
            shortDescription: p.shortDescription || '',
            origin: p.origin || 'Unknown',
            sizes: p.sizes?.length > 0 ? p.sizes.map((s: any) => ({ weight: s.weight, price: String(s.price) })) : [
                ...(p.prices?.['50g'] ? [{ weight: '50g', price: String(p.prices['50g']) }] : []),
                { weight: '100g', price: String(p.prices?.['100g'] || '') },
                ...(p.prices?.['200g'] ? [{ weight: '200g', price: String(p.prices['200g']) }] : []),
            ],
            stock: p.stock ?? 100,
            caffeine: p.caffeine || 'medium',
            tastingNotes: (p.tastingNotes || []).join(', '),
            tags: (p.tags || []).join(', '),
            brewTemp: p.brewingInstructions?.temperature || '',
            brewSteep: p.brewingInstructions?.steepTime || '',
            brewAmount: p.brewingInstructions?.amount || '',
            images: resolveProductImageList(p.images || []),

            isBestSeller: p.isBestSeller || false,
            isNewArrival: p.isNewArrival || false,
            inStock: p.inStock !== false,
        });
        setShowProductForm(true);
    };

    const handleProductFormChange = (field: string, value: any) => {
        setProductForm(prev => {
            if (field === 'stock') {
                const stockValue = Number(value);
                const normalizedStock = Number.isFinite(stockValue) ? stockValue : 0;
                return { ...prev, stock: value, inStock: normalizedStock > 0 };
            }
            return { ...prev, [field]: value };
        });
    };



    const uploadImages = async (files: FileList | File[] | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const userStr = localStorage.getItem('feelinga_user');
            if (!userStr) throw new Error('Not authenticated');
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) formData.append('images', files[i]);
            const res = await fetch('/api/v1/upload/images', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            const uploadedUrls = Array.isArray(data?.data?.urls)
                ? data.data.urls.map((url: string) => resolveProductImageUrl(url))
                : [];
            setProductForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
        } catch (err: any) {
            showToast(err.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setProductForm(prev => ({ ...prev, images: prev.images.filter((_img: string, i: number) => i !== index) }));
    };

    const handleDrop = (e: any) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer?.files;
        if (files?.length) uploadImages(files);
    };

    const handleProductSubmit = async (e: any) => {
        e.preventDefault();
        const normalizedName = productForm.name.trim();
        const normalizedDescription = productForm.description.trim();
        const normalizedOrigin = productForm.origin.trim();
        const normalizedSlug = (productForm.slug.trim() || normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, '');
        const normalizedStock = Number(productForm.stock);
        const price100g = Number(productForm['price100g']);
        const price50gRaw = String(productForm['price50g'] || '').trim();
        const price200gRaw = String(productForm['price200g'] || '').trim();
        const price50g = price50gRaw ? Number(price50gRaw) : null;
        const price200g = price200gRaw ? Number(price200gRaw) : null;

        if (!normalizedName || normalizedName.length < 2) {
            showToast('Product name must be at least 2 characters.', 'error');
            return;
        }
        if (!normalizedSlug) {
            showToast('Please provide a valid product slug.', 'error');
            return;
        }
        if (!normalizedOrigin) {
            showToast('Product origin is required.', 'error');
            return;
        }
        if (!normalizedDescription || normalizedDescription.length < 10) {
            showToast('Description should be at least 10 characters.', 'error');
            return;
        }

        const parsedSizes = (productForm.sizes || []).map((s: any) => ({
            weight: s.weight.trim(),
            price: Number(s.price)
        })).filter((s: any) => s.weight && Number.isFinite(s.price) && s.price > 0);

        if (parsedSizes.length === 0) {
            showToast('Please add at least one valid size and price.', 'error');
            return;
        }

        if (!Number.isFinite(normalizedStock) || normalizedStock < 0) {
            showToast('Stock must be 0 or higher.', 'error');
            return;
        }
        if (!Array.isArray(productForm.images) || productForm.images.length === 0) {
            showToast('Please upload at least one product image.', 'error');
            return;
        }

        const tastingNotes = productForm.tastingNotes
            ? Array.from(new Set(productForm.tastingNotes.split(',').map((s: string) => s.trim()).filter(Boolean)))
            : [];
        const tags = productForm.tags
            ? Array.from(new Set(productForm.tags.split(',').map((s: string) => s.trim()).filter(Boolean)))
            : [];

        const body = {
            name: normalizedName,
            slug: normalizedSlug,
            type: productForm.type,
            description: normalizedDescription,
            shortDescription: productForm.shortDescription.trim() || undefined,
            origin: normalizedOrigin,
            sizes: parsedSizes,
            stock: normalizedStock,
            caffeine: productForm.caffeine,
            tastingNotes,
            tags,
            brewingInstructions: {
                temperature: productForm.brewTemp.trim() || undefined,
                steepTime: productForm.brewSteep.trim() || undefined,
                amount: productForm.brewAmount.trim() || undefined,
            },
            images: productForm.images,

            isBestSeller: productForm.isBestSeller,
            isNewArrival: productForm.isNewArrival,
            inStock: normalizedStock > 0,
        };
        try {
            setActionLoading('save-product');
            if (editingProduct) {
                await adminApi(`/products/${editingProduct._id}`, { method: 'PATCH', body: JSON.stringify(body) });
            } else {
                await adminApi('/products', { method: 'POST', body: JSON.stringify(body) });
            }
            setShowProductForm(false);
            setEditingProduct(null);
            setProductForm(emptyProduct);
            loadProducts(productPagination.page);
        } catch (err: any) {
            const message = String(err?.message || '');
            if (message.toLowerCase().includes('resource already exists')) {
                showToast('A product with this slug already exists. Change name/slug and try again.', 'error');
            } else {
                showToast(message || 'Failed to save product', 'error');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const statusColors: Record<string, string> = { pending: 'var(--color-warning)', confirmed: 'var(--color-info)', processing: '#8b5cf6', shipped: 'var(--color-success)', delivered: 'var(--color-success)', cancelled: 'var(--color-error)' };

    // Loading while verifying session
    if (!authReady) {
        return (
            <div className="admin-gate" id="adminGate">
                <div className="admin-gate__panel--brand">
                    <Image src="/images/logo.png" alt="Feelinga" width={88} height={88} className="admin-gate__brand-logo" />
                    <div className="admin-gate__brand-name">Feelinga<span className="admin-gate__brand-dot">.</span></div>
                    <p className="admin-gate__brand-tagline">Happiness is here — manage your tea universe</p>
                </div>
                <div className="admin-gate__panel--form">
                    <div className="admin-gate__form-inner admin-gate__form-inner--center">
                        <p className="admin-gate__loading">Verifying session…</p>
                    </div>
                </div>
            </div>
        );
    }

    // Auth Gate
    if (!currentUser) {
        return (
            <div className="admin-gate" id="adminGate">
                {/* Brand panel */}
                <div className="admin-gate__panel--brand">
                    <Image src="/images/logo.png" alt="Feelinga" width={88} height={88} className="admin-gate__brand-logo" />
                    <div className="admin-gate__brand-name">Feelinga<span className="admin-gate__brand-dot">.</span></div>
                    <p className="admin-gate__brand-tagline">Happiness is here — manage your tea universe</p>
                    <span className="admin-gate__brand-badge">Admin Console</span>
                </div>

                {/* Form panel */}
                <div className="admin-gate__panel--form">
                    <div className="admin-gate__form-inner">
                        <p className="admin-gate__eyebrow">Secure Access</p>
                        <h1 className="admin-gate__title">Welcome back</h1>
                        <p className="admin-gate__subtitle">Sign in with your admin credentials to continue.</p>
                        {gateError && <div className="admin-gate__error" id="gateError" role="alert">{gateError}</div>}
                        <form id="adminLoginForm" onSubmit={handleAdminLogin}>
                            <div className="admin-gate__field">
                                <label htmlFor="adminEmail" className="admin-gate__label">Email</label>
                                <input id="adminEmail" type="email" className="admin-gate__input" placeholder="admin@feelinga.com" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} autoComplete="email" />
                            </div>
                            <div className="admin-gate__field">
                                <label htmlFor="adminPassword" className="admin-gate__label">Password</label>
                                <input id="adminPassword" type="password" className="admin-gate__input" placeholder="••••••••••" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} autoComplete="current-password" />
                            </div>
                            <button type="submit" className="btn btn--primary admin-gate__submit">Sign In</button>
                        </form>
                        <Link href="/" className="admin-gate__back">← Back to store</Link>
                    </div>
                </div>
            </div>
        );
    }

    const navItems = [
        { key: 'overview', icon: 'barChart', label: 'Overview' },
        { key: 'products', icon: 'leaf', label: 'Products' },
        { key: 'orders', icon: 'package', label: 'Orders' },
        { key: 'users', icon: 'users', label: 'Users' },
        { key: 'coupons', icon: 'ticket', label: 'Coupons' },
        { key: 'testimonials', icon: 'star', label: 'Reviews' },
        { key: 'messages', icon: 'message', label: 'Messages' },
        { key: 'newsletter', icon: 'mail', label: 'Newsletter' },
        { key: 'activity', icon: 'clipboard', label: 'Activity' },
    ];

    const currentSectionLabel = navItems.find(item => item.key === activeSection)?.label || capitalize(activeSection);

    return (
        <div className="admin" id="adminDashboard">
            {/* Sidebar */}
            <aside className={`admin__sidebar ${sidebarOpen ? 'open' : ''}`} id="adminSidebar" aria-label="Admin navigation">
                <div className="admin__sidebar-header">
                    <div className="admin__logo">
                        <Image src="/images/logo.png" alt="" width={32} height={32} className="admin__logo-img" />
                        <span>Feelinga<span className="admin__logo-dot">.</span> admin</span>
                    </div>
                </div>
                <div className="admin__user-info">
                    <div className="admin__user-avatar">{currentUser.name?.charAt(0)?.toUpperCase()}</div>
                    <div className="admin__user-meta">
                        <div className="admin__user-name">{currentUser.name}</div>
                        <div className="admin__user-role">Administrator</div>
                    </div>
                </div>
                <nav className="admin__nav">
                    {navItems.map(item => (
                        <button key={item.key} className={`admin__nav-item ${activeSection === item.key ? 'active' : ''}`} data-section={item.key} onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}>
                            <span><AppIcon name={item.icon} size={14} aria-hidden /></span> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="admin__sidebar-footer">
                    <Link href="/" className="admin__nav-item admin__footer-link">
                        <span><AppIcon name="store" size={14} aria-hidden /></span> Back to Store
                    </Link>
                    <button className="admin__nav-item admin__footer-logout" onClick={logout}>
                        <span><AppIcon name="logout" size={14} aria-hidden /></span> Logout
                    </button>
                </div>
            </aside>

            <button
                className={`admin__overlay ${sidebarOpen ? 'open' : ''}`}
                aria-label="Close admin navigation"
                onClick={() => setSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="admin__main">
                <header className="admin__header">
                    <div className="admin__header-left">
                        <button className="admin__mobile-toggle" aria-label="Toggle admin navigation" onClick={() => setSidebarOpen(v => !v)}>
                            ☰
                        </button>
                        <div>
                            <h1 id="pageTitle">{currentSectionLabel}</h1>
                            <p className="admin__header-subtitle">Manage store operations from one place</p>
                        </div>
                    </div>
                </header>

                <div className="admin__content">
                    {activeSection === 'overview' && (
                        <OverviewTab
                            overview={overview}
                            lowStockProducts={lowStockProducts}
                            statusColors={statusColors}
                            capitalize={capitalize}
                            exportCSV={exportCSV}
                            actionLoading={actionLoading}
                            error={tabErrors.overview}
                            onRetry={() => {
                                void loadOverview();
                                void loadLowStock();
                            }}
                        />
                    )}

                    {activeSection === 'products' && (
                        <ProductsTab
                            products={products}
                            productPagination={productPagination}
                            openCreateProduct={openCreateProduct}
                            showProductForm={showProductForm}
                            setShowProductForm={setShowProductForm}
                            editingProduct={editingProduct}
                            productForm={productForm}
                            handleProductSubmit={handleProductSubmit}
                            handleProductFormChange={handleProductFormChange}
                            capitalize={capitalize}
                            uploading={uploading}
                            dragOver={dragOver}
                            setDragOver={setDragOver}
                            handleDrop={handleDrop}
                            uploadImages={uploadImages}
                            removeImage={removeImage}

                            openEditProduct={openEditProduct}
                            deleteProduct={deleteProduct}
                            actionLoading={actionLoading}
                            loadProducts={loadProducts}
                            error={tabErrors.products}
                            onRetry={() => { void loadProducts(productPagination.page); }}
                        />
                    )}

                    {activeSection === 'orders' && (
                        <OrdersTab
                            orders={orders}
                            orderPagination={orderPagination}
                            orderSearch={orderSearch}
                            setOrderSearch={setOrderSearch}
                            orderStatusFilter={orderStatusFilter}
                            setOrderStatusFilter={setOrderStatusFilter}
                            loadOrders={loadOrders}
                            capitalize={capitalize}
                            statusColors={statusColors}
                            updateTracking={updateTracking}
                            updateOrderStatus={updateOrderStatus}
                            downloadInvoice={downloadInvoice}
                            selectedOrders={selectedOrders}
                            setSelectedOrders={setSelectedOrders}
                            bulkUpdateStatus={bulkUpdateStatus}
                            actionLoading={actionLoading}
                            error={tabErrors.orders}
                            onRetry={() => { void loadOrders(orderPagination.page, orderSearch, orderStatusFilter); }}
                        />
                    )}

                    {activeSection === 'users' && (
                        <UsersTab
                            users={users}
                            userPagination={userPagination}
                            userSearch={userSearch}
                            setUserSearch={setUserSearch}
                            loadUsers={loadUsers}
                            changeUserRole={changeUserRole}
                            error={tabErrors.users}
                            onRetry={() => { void loadUsers(userPagination.page, userSearch); }}
                        />
                    )}

                    {activeSection === 'coupons' && (
                        <CouponsTab
                            coupons={coupons}
                            couponsLoading={couponsLoading}
                            showCouponForm={showCouponForm}
                            setShowCouponForm={setShowCouponForm}
                            editingCoupon={editingCoupon}
                            setEditingCoupon={setEditingCoupon}
                            couponForm={couponForm}
                            setCouponForm={setCouponForm}
                            emptyCoupon={emptyCoupon}
                            handleCouponSubmit={handleCouponSubmit}
                            openEditCoupon={openEditCoupon}
                            deleteCoupon={deleteCoupon}
                            toggleCouponStatus={toggleCouponStatus}
                            error={tabErrors.coupons}
                            onRetry={() => { void loadCoupons(); }}
                        />
                    )}

                    {activeSection === 'testimonials' && (
                        <TestimonialsTab
                            testimonials={testimonials}
                            testimonialsLoading={testimonialsLoading}
                            showTestimonialForm={showTestimonialForm}
                            setShowTestimonialForm={setShowTestimonialForm}
                            editingTestimonial={editingTestimonial}
                            setEditingTestimonial={setEditingTestimonial}
                            testimonialForm={testimonialForm}
                            setTestimonialForm={setTestimonialForm}
                            emptyTestimonial={emptyTestimonial}
                            handleTestimonialSubmit={handleTestimonialSubmit}
                            toggleTestimonialApproval={toggleTestimonialApproval}
                            toggleTestimonialFeatured={toggleTestimonialFeatured}
                            openEditTestimonial={openEditTestimonial}
                            deleteTestimonial={deleteTestimonial}
                            error={tabErrors.testimonials}
                            onRetry={() => { void loadTestimonials(); }}
                        />
                    )}

                    {activeSection === 'messages' && (
                        <MessagesTab
                            messages={messages}
                            messagesLoading={messagesLoading}
                            error={tabErrors.messages}
                            onRetry={() => { void loadMessages(); }}
                        />
                    )}

                    {activeSection === 'newsletter' && (
                        <NewsletterTab
                            subscribers={subscribers}
                            subscribersLoading={subscribersLoading}
                            error={tabErrors.newsletter}
                            onRetry={() => { void loadSubscribers(); }}
                        />
                    )}

                    {activeSection === 'activity' && (
                        <ActivityTab
                            activity={activity}
                            error={tabErrors.activity}
                            onRetry={() => { void loadActivity(); }}
                        />
                    )}
                </div>
            </div>

            {confirmDialog && (
                <div
                    className="admin-confirm-overlay"
                    role="presentation"
                    onClick={() => { if (!confirmLoading) setConfirmDialog(null); }}
                >
                    <div
                        className="admin-confirm-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-confirm-title"
                        aria-describedby="admin-confirm-description"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="admin-confirm-title" className="admin-confirm-title">{confirmDialog.title}</h2>
                        <p id="admin-confirm-description" className="admin-confirm-description">{confirmDialog.message}</p>
                        <div className="admin-confirm-actions">
                            <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={() => setConfirmDialog(null)}
                                disabled={confirmLoading}
                            >
                                Cancel
                            </button>
                            <button
                                ref={confirmButtonRef}
                                type="button"
                                className={`btn btn--primary ${confirmDialog.tone === 'danger' ? 'admin-confirm-actions__danger' : ''}`}
                                onClick={() => { void runConfirmedAction(); }}
                                disabled={confirmLoading}
                            >
                                {confirmLoading ? 'Working...' : confirmDialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

