'use client';

import Image from 'next/image';
import AppIcon from '../../../components/AppIcon';

type AdminRecord = Record<string, any>;

type SectionBaseProps = {
    error?: string;
    onRetry: () => void;
};

export function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="admin__section active">
            <div className="admin__tab-error" role="alert">
                <div>
                    <strong>Could not load this section.</strong>
                    <p>{message}</p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={onRetry}>Retry</button>
            </div>
        </div>
    );
}

export function OverviewTab({
    overview,
    lowStockProducts,
    statusColors,
    capitalize,
    exportCSV,
    actionLoading,
    error,
    onRetry,
}: SectionBaseProps & {
    overview: AdminRecord | null;
    lowStockProducts: AdminRecord[];
    statusColors: Record<string, string>;
    capitalize: (value: string) => string;
    exportCSV: (type: string) => Promise<void>;
    actionLoading: string | null;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;
    if (!overview) {
        return (
            <div className="admin__section active" id="sectionOverview">
                <p className="admin-muted-text">Loading overview...</p>
            </div>
        );
    }

    return (
        <div className="admin__section active" id="sectionOverview">
            <div className="admin__stats">
                <div className="stat-card">
                    <div className="stat-card__icon stat-card__icon--users"><AppIcon name="users" size={18} aria-hidden /></div>
                    <div><span className="stat-card__value">{overview.totals.users}</span><span className="stat-card__label">Total Users</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__icon stat-card__icon--products"><AppIcon name="leaf" size={18} aria-hidden /></div>
                    <div><span className="stat-card__value">{overview.totals.products}</span><span className="stat-card__label">Products</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__icon stat-card__icon--orders"><AppIcon name="package" size={18} aria-hidden /></div>
                    <div><span className="stat-card__value">{overview.totals.orders}</span><span className="stat-card__label">Orders</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__icon stat-card__icon--revenue"><AppIcon name="wallet" size={18} aria-hidden /></div>
                    <div><span className="stat-card__value">₹{(overview.totals.revenue || 0).toLocaleString()}</span><span className="stat-card__label">Revenue</span></div>
                </div>
            </div>

            <div className="admin__insights">
                {overview.statusBreakdown && Object.keys(overview.statusBreakdown).length > 0 && (
                    <div className="admin__card">
                        <div className="admin__card-title">Order Status Breakdown</div>
                        <div className="admin__card-body">
                            <div className="overview-status-grid">
                                {Object.entries(overview.statusBreakdown).map(([status, count]) => (
                                    <div key={status} className={`overview-status-chip overview-status-chip--${String(status).toLowerCase()}`}>
                                        {capitalize(status)}: {count as number}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {overview.monthlyRevenue?.length > 0 && (
                    <div className="admin__card">
                        <div className="admin__card-title">Monthly Revenue</div>
                        <div className="admin__card-body">
                            <div className="overview-chart">
                                {(() => {
                                    const maxR = Math.max(...overview.monthlyRevenue.map((m: AdminRecord) => m.revenue), 1);
                                    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                    return overview.monthlyRevenue.map((m: AdminRecord, i: number) => (
                                        <div key={i} className="overview-chart__col">
                                            {(() => {
                                                const barHeight = Math.max((m.revenue / maxR) * 140, 4);
                                                return (
                                                    <>
                                                        <span className="overview-chart__value">₹{(m.revenue / 1000).toFixed(1)}k</span>
                                                        <svg
                                                            className="overview-chart__bar"
                                                            viewBox="0 0 48 140"
                                                            preserveAspectRatio="none"
                                                            aria-hidden="true"
                                                        >
                                                            <title>{`₹${m.revenue.toLocaleString()} (${m.orders} orders)`}</title>
                                                            <rect
                                                                className="overview-chart__bar-fill"
                                                                x="0"
                                                                y={140 - barHeight}
                                                                width="48"
                                                                height={barHeight}
                                                                rx="4"
                                                                ry="4"
                                                            />
                                                        </svg>
                                                        <span className="overview-chart__label">{months[m._id.month]}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {overview.recentOrders?.length > 0 && (
                <div className="admin__card overview-card">
                    <div className="admin__card-title">Recent Orders</div>
                    <div className="admin__table-wrap">
                        <table className="admin__table">
                            <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                            <tbody>
                                {overview.recentOrders.map((order: AdminRecord) => (
                                    <tr key={order._id}>
                                        <td>{order.orderNumber}</td>
                                        <td>{order.user?.name || 'N/A'}</td>
                                        <td>₹{order.total?.toLocaleString()}</td>
                                        <td><span className={`overview-status-chip overview-status-chip--sm overview-status-chip--${String(order.status).toLowerCase()}`}>{order.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {lowStockProducts.length > 0 && (
                <div className="admin__card overview-card overview-card--warning">
                    <div className="admin__card-title overview-card-title--warning"><AppIcon name="alertTriangle" size={14} aria-hidden /> Low Stock Alert ({lowStockProducts.length} items)</div>
                    <div className="admin__card-body">
                        <div className="overview-lowstock">
                            {lowStockProducts.slice(0, 8).map(p => (
                                <div key={p._id} className={`overview-lowstock__row ${p.stock <= 3 ? 'overview-lowstock__row--critical' : ''}`}>
                                    <span className="overview-lowstock__name">{p.name}</span>
                                    <span className={`overview-lowstock__count ${p.stock <= 3 ? 'overview-lowstock__count--critical' : ''}`}>
                                        {p.stock === 0 ? 'OUT OF STOCK' : `${p.stock} left`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FUTURE ANALYTICS PREVIEW */}
            <div className="admin__card overview-card">
                <div className="admin__card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AppIcon name="barChart" size={16} aria-hidden /> Advanced Analytics Preview
                    <span className="admin-badge admin-badge--neutral" style={{ marginLeft: 'auto', fontSize: '10px' }}>Coming Soon</span>
                </div>
                <div className="admin__card-body">
                    <div className="future-analytics-grid">
                        {/* Product Analytics */}
                        <div className="future-analytics-box">
                            <h4 className="future-analytics-box__title">Top Performing Products</h4>
                            <div className="future-analytics-list">
                                <div className="future-analytics-item">
                                    <div className="future-analytics-item__header">
                                        <span>Darjeeling First Flush</span>
                                        <span>42%</span>
                                    </div>
                                    <div className="future-analytics-progress"><div className="future-analytics-progress__fill" style={{ width: '42%', background: 'var(--color-accent)' }}></div></div>
                                </div>
                                <div className="future-analytics-item">
                                    <div className="future-analytics-item__header">
                                        <span>Assam Golden Tips</span>
                                        <span>28%</span>
                                    </div>
                                    <div className="future-analytics-progress"><div className="future-analytics-progress__fill" style={{ width: '28%', background: '#6B9B6B' }}></div></div>
                                </div>
                                <div className="future-analytics-item">
                                    <div className="future-analytics-item__header">
                                        <span>Kashmiri Kahwa</span>
                                        <span>15%</span>
                                    </div>
                                    <div className="future-analytics-progress"><div className="future-analytics-progress__fill" style={{ width: '15%', background: '#5B9BD5' }}></div></div>
                                </div>
                            </div>
                        </div>

                        {/* Customer Acquisition */}
                        <div className="future-analytics-box">
                            <h4 className="future-analytics-box__title">Customer Acquisition</h4>
                            <div className="future-analytics-list">
                                <div className="future-analytics-item">
                                    <div className="future-analytics-item__header">
                                        <span>Organic Search</span>
                                        <span>55%</span>
                                    </div>
                                    <div className="future-analytics-progress"><div className="future-analytics-progress__fill" style={{ width: '55%', background: '#5B9BD5' }}></div></div>
                                </div>
                                <div className="future-analytics-item">
                                    <div className="future-analytics-item__header">
                                        <span>Social Media</span>
                                        <span>30%</span>
                                    </div>
                                    <div className="future-analytics-progress"><div className="future-analytics-progress__fill" style={{ width: '30%', background: '#D46B6B' }}></div></div>
                                </div>
                                <div className="future-analytics-item">
                                    <div className="future-analytics-item__header">
                                        <span>Direct Traffic</span>
                                        <span>15%</span>
                                    </div>
                                    <div className="future-analytics-progress"><div className="future-analytics-progress__fill" style={{ width: '15%', background: '#6B9B6B' }}></div></div>
                                </div>
                            </div>
                        </div>

                        {/* AI Forecasting */}
                        <div className="future-analytics-box future-analytics-box--highlight">
                            <h4 className="future-analytics-box__title" style={{ color: 'var(--color-accent)' }}><AppIcon name="zap" size={14} aria-hidden /> AI Revenue Forecast</h4>
                            <div className="future-forecast">
                                <div className="future-forecast__value">₹145.2k</div>
                                <div className="future-forecast__trend">+12.5% expected next month</div>
                                <div className="future-forecast__chart">
                                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                                        <path d="M0,25 C20,25 20,5 40,15 C60,25 70,5 100,5" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
                                        <circle cx="100" cy="5" r="3" fill="var(--color-accent)" />
                                    </svg>
                                </div>
                                <p className="future-forecast__note">Model training in progress using historical data.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="admin__card overview-card">
                <div className="admin__card-title">Export Data</div>
                <div className="admin__card-body">
                    <div className="overview-export">
                        <button className="btn btn--ghost btn--sm" onClick={() => exportCSV('orders')} disabled={!!actionLoading}>{actionLoading === 'export-orders' ? 'Exporting...' : 'Export Orders CSV'}</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => exportCSV('products')} disabled={!!actionLoading}>{actionLoading === 'export-products' ? 'Exporting...' : 'Export Products CSV'}</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => exportCSV('users')} disabled={!!actionLoading}>{actionLoading === 'export-users' ? 'Exporting...' : 'Export Users CSV'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ProductsTab({
    products,
    productPagination,
    openCreateProduct,
    showProductForm,
    setShowProductForm,
    editingProduct,
    productForm,
    handleProductSubmit,
    handleProductFormChange,
    capitalize,
    uploading,
    dragOver,
    setDragOver,
    handleDrop,
    uploadImages,
    removeImage,
    toggleMood,
    openEditProduct,
    deleteProduct,
    actionLoading,
    loadProducts,
    error,
    onRetry,
}: SectionBaseProps & {
    products: AdminRecord[];
    productPagination: { page: number; totalPages: number };
    openCreateProduct: () => void;
    showProductForm: boolean;
    setShowProductForm: (value: boolean) => void;
    editingProduct: AdminRecord | null;
    productForm: AdminRecord;
    handleProductSubmit: (event: any) => Promise<void>;
    handleProductFormChange: (field: string, value: any) => void;
    capitalize: (value: string) => string;
    uploading: boolean;
    dragOver: boolean;
    setDragOver: (value: boolean) => void;
    handleDrop: (event: any) => void;
    uploadImages: (files: FileList | File[] | null) => Promise<void>;
    removeImage: (index: number) => void;
    toggleMood: (mood: string) => void;
    openEditProduct: (product: AdminRecord) => void;
    deleteProduct: (id: string, name: string) => Promise<void>;
    actionLoading: string | null;
    loadProducts: (page?: number) => Promise<void>;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    return (
        <div className="admin__section active" id="sectionProducts">
            <div className="admin__section-header">
                <h3>{products.length} Products</h3>
                <button className="btn btn--primary btn--sm" onClick={openCreateProduct}>+ Add Product</button>
            </div>

            {showProductForm && (
                <div className="admin-modal active">
                    <div className="admin-modal__overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowProductForm(false); }}>
                        <div className="admin-modal__dialog admin-modal__dialog--product">
                        <div className="admin-modal__header">
                            <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                            <button className="admin-modal__close" onClick={() => setShowProductForm(false)}><AppIcon name="xCircle" size={16} aria-hidden /></button>
                        </div>
                        <form onSubmit={handleProductSubmit} className="admin-product-form">
                            <section className="admin-form-section">
                                <h4 className="admin-form-section__title">Basic Details</h4>
                                <p className="admin-form-section__hint">Core product identity shown across catalog and search.</p>
                                <div className="admin-form-subgrid">
                                    <div><label className="admin-form-label">Name *</label><input className="admin-form-control" type="text" required value={productForm.name} onChange={e => handleProductFormChange('name', e.target.value)} /></div>
                                    <div>
                                        <label className="admin-form-label">Slug</label>
                                        <input className="admin-form-control" type="text" value={productForm.slug} onChange={e => handleProductFormChange('slug', e.target.value)} placeholder="auto-generated from name" />
                                        <div className="admin-form-helper">Used in URL: <code>{(productForm.slug || productForm.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'your-product-slug'}</code></div>
                                    </div>
                                    <div>
                                        <label className="admin-form-label">Type *</label>
                                        <select className="admin-form-control" value={productForm.type} onChange={e => handleProductFormChange('type', e.target.value)}>
                                            {['Black Tea', 'Green Tea', 'White Tea', 'Oolong', 'Herbal', 'Herbal Infusion', 'Masala Chai', 'Matcha'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="admin-form-label">Origin *</label><input className="admin-form-control" type="text" required value={productForm.origin} onChange={e => handleProductFormChange('origin', e.target.value)} placeholder="e.g. Darjeeling, India" /></div>
                                    <div className="admin-form-grid__span-all"><label className="admin-form-label">Description *</label><textarea className="admin-form-control admin-form-control--textarea" required value={productForm.description} onChange={e => handleProductFormChange('description', e.target.value)} /></div>
                                    <div className="admin-form-grid__span-all">
                                        <label className="admin-form-label">Short Description</label>
                                        <input className="admin-form-control" type="text" maxLength={200} value={productForm.shortDescription} onChange={e => handleProductFormChange('shortDescription', e.target.value)} />
                                        <div className="admin-form-helper">Max 200 characters. Used on product cards.</div>
                                    </div>
                                </div>
                            </section>

                            <section className="admin-form-section">
                                <h4 className="admin-form-section__title">Pricing & Inventory</h4>
                                <p className="admin-form-section__hint">Set pack-wise pricing and available stock.</p>
                                <div className="admin-form-subgrid">
                                    <div><label className="admin-form-label">50g (₹)</label><input className="admin-form-control" type="number" min={0} step="0.01" value={productForm['price50g']} onChange={e => handleProductFormChange('price50g', e.target.value)} /></div>
                                    <div><label className="admin-form-label">100g (₹) *</label><input className="admin-form-control" type="number" min={0} step="0.01" required value={productForm['price100g']} onChange={e => handleProductFormChange('price100g', e.target.value)} /></div>
                                    <div><label className="admin-form-label">200g (₹)</label><input className="admin-form-control" type="number" min={0} step="0.01" value={productForm['price200g']} onChange={e => handleProductFormChange('price200g', e.target.value)} /></div>
                                    <div>
                                        <label className="admin-form-label">Stock</label>
                                        <input className="admin-form-control" type="number" min={0} value={productForm.stock} onChange={e => handleProductFormChange('stock', e.target.value)} />
                                        <div className={`admin-stock-indicator ${Number(productForm.stock || 0) > 0 ? 'is-in' : 'is-out'}`}>
                                            {Number(productForm.stock || 0) > 0 ? 'In stock' : 'Out of stock'} (auto sync)
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="admin-form-section">
                                <h4 className="admin-form-section__title">Attributes & Discoverability</h4>
                                <p className="admin-form-section__hint">These values appear in shop cards, filters, and product pages.</p>
                                <div className="admin-form-subgrid">
                                    <div>
                                        <label className="admin-form-label">Caffeine</label>
                                        <select className="admin-form-control" value={productForm.caffeine} onChange={e => handleProductFormChange('caffeine', e.target.value)}>
                                            {['none', 'low', 'medium', 'high'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="admin-form-label">Tasting Notes</label>
                                        <input className="admin-form-control" type="text" placeholder="floral, citrus, malty" value={productForm.tastingNotes} onChange={e => handleProductFormChange('tastingNotes', e.target.value)} />
                                        <div className="admin-form-helper">Comma separated.</div>
                                    </div>
                                    <div className="admin-form-grid__span-all">
                                        <label className="admin-form-label">Tags</label>
                                        <input className="admin-form-control" type="text" placeholder="premium, bestseller" value={productForm.tags} onChange={e => handleProductFormChange('tags', e.target.value)} />
                                        <div className="admin-form-helper">Comma separated keywords for search.</div>
                                    </div>
                                    <div className="admin-form-grid__span-all">
                                        <label className="admin-form-label">Moods</label>
                                        <div className="admin-moods">
                                            {['energize', 'relax', 'focus', 'detox', 'glow', 'immunity'].map(mood => (
                                                <button type="button" key={mood} onClick={() => toggleMood(mood)} className={`admin-mood-chip ${productForm.moods.includes(mood) ? 'is-active' : ''}`}>{capitalize(mood)}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="admin-flags">
                                        <label className="admin-flag"><input type="checkbox" checked={productForm.isBestSeller} onChange={e => handleProductFormChange('isBestSeller', e.target.checked)} /> Best Seller</label>
                                        <label className="admin-flag"><input type="checkbox" checked={productForm.isNewArrival} onChange={e => handleProductFormChange('isNewArrival', e.target.checked)} /> New Arrival</label>
                                    </div>
                                </div>
                            </section>

                            <section className="admin-form-section">
                                <h4 className="admin-form-section__title">Brewing Guide</h4>
                                <p className="admin-form-section__hint">Optional but helpful for better conversion and customer trust.</p>
                                <div className="admin-form-subgrid">
                                    <div><label className="admin-form-label">Brewing Temperature</label><input className="admin-form-control" type="text" placeholder="e.g. 85°C" value={productForm.brewTemp} onChange={e => handleProductFormChange('brewTemp', e.target.value)} /></div>
                                    <div><label className="admin-form-label">Steep Time</label><input className="admin-form-control" type="text" placeholder="e.g. 2-3 minutes" value={productForm.brewSteep} onChange={e => handleProductFormChange('brewSteep', e.target.value)} /></div>
                                    <div className="admin-form-grid__span-all"><label className="admin-form-label">Tea Amount</label><input className="admin-form-control" type="text" placeholder="e.g. 1 tsp per 200ml" value={productForm.brewAmount} onChange={e => handleProductFormChange('brewAmount', e.target.value)} /></div>
                                </div>
                            </section>

                            <section className="admin-form-section">
                                <h4 className="admin-form-section__title">Product Images</h4>
                                <p className="admin-form-section__hint">Add at least one image to avoid placeholder visuals in storefront.</p>
                                {productForm.images.length > 0 && (
                                    <div className="admin-product-images">
                                        {productForm.images.map((url: string, i: number) => (
                                            <div key={i} className="admin-product-images__thumb">
                                                <Image src={url} alt={`Product ${i + 1}`} width={72} height={72} className="admin-product-images__img" />
                                                <button type="button" className="admin-product-images__remove" onClick={() => removeImage(i)}><AppIcon name="xCircle" size={12} aria-hidden /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('productImageInput')?.click()}
                                    className={`admin-upload-dropzone ${dragOver ? 'is-dragover' : ''}`}
                                >
                                    <input
                                        id="productImageInput"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                                        multiple
                                        className="admin-upload-dropzone__input"
                                        onChange={(e) => uploadImages(e.target.files)}
                                    />
                                    {uploading ? (
                                        <span className="admin-upload-dropzone__uploading">Uploading...</span>
                                    ) : (
                                        <>
                                            <div className="admin-upload-dropzone__icon"><AppIcon name="archive" size={20} aria-hidden /></div>
                                            <span className="admin-upload-dropzone__text">Drag &amp; drop images here, or <strong className="admin-upload-dropzone__highlight">browse from PC</strong></span>
                                            <div className="admin-upload-dropzone__hint">JPEG, PNG, WebP, GIF, AVIF · Max 5 MB each</div>
                                        </>
                                    )}
                                </div>
                            </section>

                            <div className="admin-form-actions">
                                <button type="submit" className="btn btn--primary" disabled={actionLoading === 'save-product'}>
                                    {actionLoading === 'save-product' ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                                </button>
                                <button type="button" className="btn btn--ghost" onClick={() => setShowProductForm(false)} disabled={actionLoading === 'save-product'}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
                </div>
            )}

            <div className="admin__table-wrap">
                <table className="admin__table">
                    <thead><tr><th>Name</th><th>Type</th><th>Price (100g)</th><th>Stock</th><th>Actions</th></tr></thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p._id}>
                                <td>{p.name}</td>
                                <td>{p.type}</td>
                                <td>₹{p.prices?.['100g'] || '-'}</td>
                                <td>{p.stock}</td>
                                <td className="admin-table-actions">
                                    <button className="btn btn--ghost btn--sm" onClick={() => openEditProduct(p)}>Edit</button>
                                    <button className="btn btn--ghost btn--sm admin-btn-danger" onClick={() => deleteProduct(p._id, p.name)} disabled={actionLoading === `del-${p._id}`}>{actionLoading === `del-${p._id}` ? 'Deleting...' : 'Delete'}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {productPagination.totalPages > 1 && (
                <div className="admin-pagination-inline">
                    {Array.from({ length: productPagination.totalPages }, (_, i) => (
                        <button key={i} className={`btn btn--sm ${productPagination.page === i + 1 ? 'btn--primary' : 'btn--ghost'}`} onClick={() => loadProducts(i + 1)}>{i + 1}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function OrdersTab({
    orders,
    orderPagination,
    orderSearch,
    setOrderSearch,
    orderStatusFilter,
    setOrderStatusFilter,
    loadOrders,
    capitalize,
    statusColors,
    updateTracking,
    updateOrderStatus,
    downloadInvoice,
    selectedOrders,
    setSelectedOrders,
    bulkUpdateStatus,
    actionLoading,
    error,
    onRetry,
}: SectionBaseProps & {
    orders: AdminRecord[];
    orderPagination: { page: number; totalPages: number };
    orderSearch: string;
    setOrderSearch: (value: string) => void;
    orderStatusFilter: string;
    setOrderStatusFilter: (value: string) => void;
    loadOrders: (page?: number, search?: string, status?: string) => Promise<void>;
    capitalize: (value: string) => string;
    statusColors: Record<string, string>;
    updateTracking: (orderId: string, trackingNumber: string, trackingUrl: string) => Promise<void>;
    updateOrderStatus: (id: string, status: string) => Promise<void>;
    downloadInvoice: (orderId: string) => Promise<void>;
    selectedOrders: string[];
    setSelectedOrders: (ids: string[]) => void;
    bulkUpdateStatus: (status: string) => Promise<void>;
    actionLoading: string | null;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
    const someSelected = selectedOrders.length > 0;

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(orders.map(o => o._id));
        }
    };

    const handleSelectOrder = (id: string) => {
        if (selectedOrders.includes(id)) {
            setSelectedOrders(selectedOrders.filter(s => s !== id));
        } else {
            setSelectedOrders([...selectedOrders, id]);
        }
    };

    return (
        <div className="admin__section active" id="sectionOrders">
            <div className="admin-section-toolbar">
                <h3>{orders.length} Orders</h3>
                <div className="admin-section-toolbar__actions">
                    <select
                        value={orderStatusFilter}
                        onChange={(e) => { setOrderStatusFilter(e.target.value); loadOrders(1, orderSearch, e.target.value); }}
                        className="admin-filter-control"
                    >
                        <option value="">All Statuses</option>
                        {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                            <option key={s} value={s}>{capitalize(s)}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadOrders(1, orderSearch, orderStatusFilter)}
                        className="admin-filter-control admin-filter-control--search"
                    />
                    <button className="btn btn--ghost btn--sm" onClick={() => loadOrders(1, orderSearch, orderStatusFilter)}>Search</button>
                </div>
            </div>

            {someSelected && (
                <div className="admin-bulk-actions">
                    <span>{selectedOrders.length} selected</span>
                    <select
                        onChange={(e) => { if (e.target.value) bulkUpdateStatus(e.target.value); e.target.value = ''; }}
                        className="admin-bulk-select"
                        disabled={!!actionLoading}
                    >
                        <option value="">Bulk Update Status</option>
                        {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                            <option key={s} value={s}>{capitalize(s)}</option>
                        ))}
                    </select>
                    <button className="btn btn--ghost btn--sm" onClick={() => setSelectedOrders([])}>Clear</button>
                </div>
            )}

            <div className="admin__table-wrap">
                <table className="admin__table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" checked={allSelected} onChange={handleSelectAll} /></th>
                            <th>Order #</th>
                            <th>Date & Time</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Tracking</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order._id}>
                                <td><input type="checkbox" checked={selectedOrders.includes(order._id)} onChange={() => handleSelectOrder(order._id)} /></td>
                                <td>{order.orderNumber}</td>
                                <td className="admin-orders-date">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}<br />{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</td>
                                <td>{order.user?.name || order.user?.email || 'N/A'}</td>
                                <td>₹{order.total}</td>
                                <td><span className={`status-badge status-badge--${order.status}`}>{order.status}</span></td>
                                <td>
                                    <div className="admin-tracking-stack">
                                        <input
                                            type="text"
                                            placeholder="Tracking #"
                                            defaultValue={order.trackingNumber || ''}
                                            onBlur={(e) => {
                                                const val = e.target.value.trim();
                                                if (val !== (order.trackingNumber || '')) {
                                                    updateTracking(order._id, val, order.trackingUrl || '');
                                                }
                                            }}
                                            className="admin-tracking-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Tracking URL"
                                            defaultValue={order.trackingUrl || ''}
                                            onBlur={(e) => {
                                                const val = e.target.value.trim();
                                                if (val !== (order.trackingUrl || '')) {
                                                    updateTracking(order._id, order.trackingNumber || '', val);
                                                }
                                            }}
                                            className="admin-tracking-input"
                                        />
                                    </div>
                                </td>
                                <td className="admin-actions-inline">
                                    <select className="admin-select-compact" value={order.status} onChange={(e) => updateOrderStatus(order._id, e.target.value)} disabled={actionLoading === `status-${order._id}`}>
                                        {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                            <option key={s} value={s}>{capitalize(s)}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn--ghost btn--sm admin-btn-icon-sm" title="Download Invoice" onClick={() => downloadInvoice(order._id)} disabled={actionLoading === `invoice-${order._id}`}>{actionLoading === `invoice-${order._id}` ? '...' : <AppIcon name="receipt" size={14} aria-hidden />}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {orderPagination.totalPages > 1 && (
                <div className="admin-pagination-inline">
                    {Array.from({ length: orderPagination.totalPages }, (_, i) => (
                        <button key={i} className={`btn btn--sm ${orderPagination.page === i + 1 ? 'btn--primary' : 'btn--ghost'}`} onClick={() => loadOrders(i + 1)}>{i + 1}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function UsersTab({
    users,
    userPagination,
    userSearch,
    setUserSearch,
    loadUsers,
    changeUserRole,
    error,
    onRetry,
}: SectionBaseProps & {
    users: AdminRecord[];
    userPagination: { page: number; totalPages: number; total: number };
    userSearch: string;
    setUserSearch: (value: string) => void;
    loadUsers: (page?: number, search?: string) => Promise<void>;
    changeUserRole: (userId: string, role: string) => Promise<void>;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    return (
        <div className="admin__section active" id="sectionUsers">
            <div className="admin-section-toolbar">
                <h3>{userPagination.total || users.length} Users</h3>
                <div className="admin-section-toolbar__actions">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadUsers(1, userSearch)}
                        className="admin-filter-control admin-filter-control--search"
                    />
                    <button className="btn btn--ghost btn--sm" onClick={() => loadUsers(1, userSearch)}>Search</button>
                </div>
            </div>
            <div className="admin__table-wrap">
                <table className="admin__table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Orders</th><th>Spent</th><th>Joined</th><th>Actions</th></tr></thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td>{u.name}</td>
                                <td className="admin-cell-sm">{u.email}</td>
                                <td><span className={`admin-role-pill ${u.role === 'admin' ? 'admin-role-pill--admin' : ''}`}>{u.role}</span></td>
                                <td>{u.orderCount}</td>
                                <td>₹{(u.totalSpent || 0).toLocaleString()}</td>
                                <td className="admin-cell-sm">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                                <td>
                                    <select
                                        className="admin-select-compact admin-select-compact--sm"
                                        value={u.role}
                                        onChange={(e) => changeUserRole(u._id, e.target.value)}
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {userPagination.totalPages > 1 && (
                <div className="admin-pagination-inline">
                    {Array.from({ length: userPagination.totalPages }, (_, i) => (
                        <button key={i} className={`btn btn--sm ${userPagination.page === i + 1 ? 'btn--primary' : 'btn--ghost'}`} onClick={() => loadUsers(i + 1, userSearch)}>{i + 1}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ActivityTab({
    activity,
    error,
    onRetry,
}: SectionBaseProps & {
    activity: AdminRecord[];
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    return (
        <div className="admin__section active" id="sectionActivity">
            <div className="activity-feed">
                {activity.length === 0 ? (
                    <p className="admin-muted-text">No activity yet.</p>
                ) : (
                    activity.map((item, i) => (
                        <div key={i} className="activity-feed__item">
                            <div className="activity-feed__header">
                                <strong>{item.summary}</strong>
                                <span className="activity-feed__time">{new Date(item.createdAt).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="activity-feed__detail">
                                {item.actorName} · {item.action}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export function MessagesTab({
    messages,
    messagesLoading,
    error,
    onRetry,
}: SectionBaseProps & {
    messages: AdminRecord[];
    messagesLoading: boolean;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    return (
        <div className="admin__section active">
            <h3 className="admin-section-title">Contact Messages</h3>
            {messagesLoading ? (
                <p className="admin-muted-text">Loading messages...</p>
            ) : messages.length === 0 ? (
                <p className="admin-muted-text">No messages yet.</p>
            ) : (
                <div className="admin-message-list">
                    {messages.map((msg, i) => (
                        <div key={msg._id || i} className="admin-message-card">
                            <div className="admin-message-card__header">
                                <div>
                                    <strong>{msg.name}</strong>
                                    <span className="admin-message-card__email">{msg.email}</span>
                                </div>
                                <span className="admin-message-card__date">{new Date(msg.createdAt).toLocaleString('en-IN')}</span>
                            </div>
                            {msg.subject && <div className="admin-message-card__subject">{msg.subject}</div>}
                            <p className="admin-message-card__body">{msg.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function NewsletterTab({
    subscribers,
    subscribersLoading,
    error,
    onRetry,
}: SectionBaseProps & {
    subscribers: AdminRecord[];
    subscribersLoading: boolean;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    return (
        <div className="admin__section active">
            <div className="admin__section-header">
                <h3>{subscribers.length} Subscriber{subscribers.length !== 1 ? 's' : ''}</h3>
            </div>
            {subscribersLoading ? (
                <p className="admin-muted-text">Loading subscribers...</p>
            ) : subscribers.length === 0 ? (
                <p className="admin-muted-text">No subscribers yet.</p>
            ) : (
                <table className="admin__table">
                    <thead><tr><th>Email</th><th>Subscribed</th></tr></thead>
                    <tbody>
                        {subscribers.map((sub, i) => (
                            <tr key={sub._id || i}>
                                <td>{sub.email}</td>
                                <td className="admin-cell-sm-muted">{new Date(sub.createdAt).toLocaleDateString('en-IN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export function CouponsTab({
    coupons,
    couponsLoading,
    showCouponForm,
    setShowCouponForm,
    editingCoupon,
    setEditingCoupon,
    couponForm,
    setCouponForm,
    emptyCoupon,
    handleCouponSubmit,
    openEditCoupon,
    deleteCoupon,
    toggleCouponStatus,
    error,
    onRetry,
}: SectionBaseProps & {
    coupons: AdminRecord[];
    couponsLoading: boolean;
    showCouponForm: boolean;
    setShowCouponForm: (value: boolean) => void;
    editingCoupon: AdminRecord | null;
    setEditingCoupon: (value: AdminRecord | null) => void;
    couponForm: AdminRecord;
    setCouponForm: (updater: any) => void;
    emptyCoupon: AdminRecord;
    handleCouponSubmit: (event: any) => Promise<void>;
    openEditCoupon: (coupon: AdminRecord) => void;
    deleteCoupon: (id: string) => Promise<void>;
    toggleCouponStatus: (coupon: AdminRecord) => Promise<void>;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    return (
        <div className="admin__section active">
            <div className="admin__section-header">
                <h3>{coupons.length} Coupon{coupons.length !== 1 ? 's' : ''}</h3>
                <button className="btn btn--primary btn--sm" onClick={() => { setEditingCoupon(null); setCouponForm(emptyCoupon); setShowCouponForm(true); }}>+ Add Coupon</button>
            </div>

            {showCouponForm && (
                <div className="admin-modal active">
                    <div className="admin-modal__overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCouponForm(false); }}>
                        <div className="admin-modal__dialog admin-modal__dialog--coupon">
                        <div className="admin-modal__header">
                            <h2>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
                            <button className="admin-modal__close" onClick={() => setShowCouponForm(false)}><AppIcon name="xCircle" size={16} aria-hidden /></button>
                        </div>
                        <form onSubmit={handleCouponSubmit} className="admin-form-grid">
                            <div><label>Campaign Name</label><input className="admin-form-control" type="text" value={couponForm.name} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, name: e.target.value }))} placeholder="e.g. Diwali Delight" /></div>
                            <div className="admin-form-grid__span-all"><label>Code *</label><input className="admin-form-control admin-form-control--uppercase" type="text" required value={couponForm.code} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, code: e.target.value }))} placeholder="e.g. WELCOME20" /></div>
                            <div>
                                <label>Campaign Type</label>
                                <select className="admin-form-control" value={couponForm.campaignType} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, campaignType: e.target.value }))}>
                                    <option value="regular">Regular</option>
                                    <option value="seasonal">Seasonal</option>
                                    <option value="festival">Festival</option>
                                </select>
                            </div>
                            <div><label>Campaign Label</label><input className="admin-form-control" type="text" value={couponForm.campaignLabel} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, campaignLabel: e.target.value }))} placeholder="e.g. Festive Sale" /></div>
                            <div className="admin-form-grid__span-all"><label>Banner Text</label><input className="admin-form-control" type="text" value={couponForm.bannerText} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, bannerText: e.target.value }))} placeholder="e.g. Diwali Sale: 20% off with code DIWALI20" /></div>
                            <div><label>Priority</label><input className="admin-form-control" type="number" min={0} value={couponForm.priority} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, priority: e.target.value }))} /></div>
                            <div>
                                <label>Discount Type</label>
                                <select className="admin-form-control" value={couponForm.discountType} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, discountType: e.target.value }))}>
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="flat">Flat (₹)</option>
                                </select>
                            </div>
                            <div><label>Discount Value *</label><input className="admin-form-control" type="number" required min={1} value={couponForm.discountValue} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, discountValue: e.target.value }))} /></div>
                            <div><label>Min Order (₹)</label><input className="admin-form-control" type="number" min={0} value={couponForm.minOrderAmount} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, minOrderAmount: e.target.value }))} /></div>
                            <div><label>Max Discount (₹)</label><input className="admin-form-control" type="number" min={0} value={couponForm.maxDiscount} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, maxDiscount: e.target.value }))} /></div>
                            <div><label>Usage Limit</label><input className="admin-form-control" type="number" min={0} value={couponForm.usageLimit} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, usageLimit: e.target.value }))} /></div>
                            <div><label>Per-User Limit</label><input className="admin-form-control" type="number" min={0} value={couponForm.perUserLimit} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, perUserLimit: e.target.value }))} /></div>
                            <div><label>Valid From</label><input className="admin-form-control" type="date" value={couponForm.validFrom} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, validFrom: e.target.value }))} /></div>
                            <div><label>Valid To</label><input className="admin-form-control" type="date" value={couponForm.validTo} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, validTo: e.target.value }))} /></div>
                            <div className="admin-form-grid__span-all admin-flags">
                                <label className="admin-flag"><input type="checkbox" checked={couponForm.active} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, active: e.target.checked }))} /> Enable coupon</label>
                                <label className="admin-flag"><input type="checkbox" checked={couponForm.featuredOnStore} onChange={e => setCouponForm((f: AdminRecord) => ({ ...f, featuredOnStore: e.target.checked }))} /> Show as active campaign on storefront</label>
                            </div>
                            <div className="admin-form-actions">
                                <button type="submit" className="btn btn--primary">{editingCoupon ? 'Update Coupon' : 'Create Coupon'}</button>
                                <button type="button" className="btn btn--ghost" onClick={() => setShowCouponForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
                </div>
            )}

            {couponsLoading ? (
                <p className="admin-muted-text">Loading coupons...</p>
            ) : coupons.length === 0 ? (
                <p className="admin-muted-text">No coupons yet. Create one to offer discounts!</p>
            ) : (
                <div className="admin__table-wrap">
                    <table className="admin__table">
                        <thead><tr><th>Campaign</th><th>Code</th><th>Discount</th><th>Min Order</th><th>Valid Until</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {coupons.map(c => (
                                <tr key={c._id}>
                                    <td>
                                        <div><strong>{c.name || 'Untitled Campaign'}</strong></div>
                                        <div className="admin-cell-sm-muted">{c.campaignType || 'regular'}{c.campaignLabel ? ` · ${c.campaignLabel}` : ''}{c.featuredOnStore ? ' · Storefront' : ''}</div>
                                    </td>
                                    <td><strong>{c.code}</strong></td>
                                    <td>{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}{c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}</td>
                                    <td>{c.minOrderAmount ? `₹${c.minOrderAmount}` : '—'}</td>
                                    <td className="admin-cell-sm-muted">{c.validTo ? new Date(c.validTo).toLocaleDateString('en-IN') : '∞'}</td>
                                    <td><span className={`admin-badge ${c.active ? 'admin-badge--success' : 'admin-badge--neutral'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                                    <td className="admin-table-actions">
                                        <button className="btn btn--ghost btn--sm" onClick={() => toggleCouponStatus(c)}>{c.active ? 'Disable' : 'Enable'}</button>
                                        <button className="btn btn--ghost btn--sm" onClick={() => openEditCoupon(c)}>Edit</button>
                                        <button className="btn btn--ghost btn--sm admin-btn-danger" onClick={() => deleteCoupon(c._id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export function TestimonialsTab({
    testimonials,
    testimonialsLoading,
    showTestimonialForm,
    setShowTestimonialForm,
    editingTestimonial,
    setEditingTestimonial,
    testimonialForm,
    setTestimonialForm,
    emptyTestimonial,
    handleTestimonialSubmit,
    toggleTestimonialApproval,
    toggleTestimonialFeatured,
    openEditTestimonial,
    deleteTestimonial,
    error,
    onRetry,
}: SectionBaseProps & {
    testimonials: AdminRecord[];
    testimonialsLoading: boolean;
    showTestimonialForm: boolean;
    setShowTestimonialForm: (value: boolean) => void;
    editingTestimonial: AdminRecord | null;
    setEditingTestimonial: (value: AdminRecord | null) => void;
    testimonialForm: AdminRecord;
    setTestimonialForm: (updater: any) => void;
    emptyTestimonial: AdminRecord;
    handleTestimonialSubmit: (event: any) => Promise<void>;
    toggleTestimonialApproval: (testimonial: AdminRecord) => Promise<void>;
    toggleTestimonialFeatured: (testimonial: AdminRecord) => Promise<void>;
    openEditTestimonial: (testimonial: AdminRecord) => void;
    deleteTestimonial: (id: string) => Promise<void>;
}) {
    if (error) return <SectionError message={error} onRetry={onRetry} />;

    return (
        <div className="admin__section active">
            <div className="admin__section-header">
                <h3>{testimonials.length} Review{testimonials.length !== 1 ? 's' : ''} · {testimonials.filter(t => t.approved).length} Approved</h3>
                <button className="btn btn--primary btn--sm" onClick={() => { setEditingTestimonial(null); setTestimonialForm(emptyTestimonial); setShowTestimonialForm(true); }}>+ Add Review</button>
            </div>

            {showTestimonialForm && (
                <div className="admin-modal active">
                    <div className="admin-modal__overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTestimonialForm(false); }}>
                        <div className="admin-modal__dialog admin-modal__dialog--testimonial">
                        <div className="admin-modal__header">
                            <h2>{editingTestimonial ? 'Edit Review' : 'Add Review'}</h2>
                            <button className="admin-modal__close" onClick={() => setShowTestimonialForm(false)}><AppIcon name="xCircle" size={16} aria-hidden /></button>
                        </div>
                        <form onSubmit={handleTestimonialSubmit} className="admin-form-grid">
                            <div><label>Author Name *</label><input className="admin-form-control" type="text" required value={testimonialForm.author} onChange={e => setTestimonialForm((f: AdminRecord) => ({ ...f, author: e.target.value }))} placeholder="e.g. Priya Sharma" /></div>
                            <div><label>Role / Location</label><input className="admin-form-control" type="text" value={testimonialForm.role} onChange={e => setTestimonialForm((f: AdminRecord) => ({ ...f, role: e.target.value }))} placeholder="e.g. Tea Enthusiast, Mumbai" /></div>
                            <div className="admin-form-grid__span-all"><label>Review Text *</label><textarea className="admin-form-control admin-form-control--textarea" required rows={4} value={testimonialForm.text} onChange={e => setTestimonialForm((f: AdminRecord) => ({ ...f, text: e.target.value }))} placeholder="Write the customer's review text..." /></div>
                            <div>
                                <label>Rating</label>
                                <select className="admin-form-control" value={testimonialForm.rating} onChange={e => setTestimonialForm((f: AdminRecord) => ({ ...f, rating: Number(e.target.value) }))}>
                                    <option value={5}>★★★★★ (5)</option>
                                    <option value={4}>★★★★☆ (4)</option>
                                    <option value={3}>★★★☆☆ (3)</option>
                                    <option value={2}>★★☆☆☆ (2)</option>
                                    <option value={1}>★☆☆☆☆ (1)</option>
                                </select>
                            </div>
                            <div><label>Display Order</label><input className="admin-form-control" type="number" min={0} value={testimonialForm.order} onChange={e => setTestimonialForm((f: AdminRecord) => ({ ...f, order: Number(e.target.value) || 0 }))} placeholder="0" /></div>
                            <div className="admin-flags">
                                <label className="admin-flag"><input type="checkbox" checked={testimonialForm.approved} onChange={e => setTestimonialForm((f: AdminRecord) => ({ ...f, approved: e.target.checked }))} /> Approved (visible on homepage)</label>
                                <label className="admin-flag"><input type="checkbox" checked={testimonialForm.featured} onChange={e => setTestimonialForm((f: AdminRecord) => ({ ...f, featured: e.target.checked }))} /> Featured (shown first)</label>
                            </div>
                            <div className="admin-form-actions">
                                <button type="submit" className="btn btn--primary">{editingTestimonial ? 'Update Review' : 'Add Review'}</button>
                                <button type="button" className="btn btn--ghost" onClick={() => setShowTestimonialForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
                </div>
            )}

            {testimonialsLoading ? (
                <p className="admin-muted-text">Loading reviews...</p>
            ) : testimonials.length === 0 ? (
                <p className="admin-muted-text">No reviews yet. Add customer reviews to display on the homepage!</p>
            ) : (
                <div className="testimonial-list">
                    {testimonials.map(t => (
                        <div key={t._id} className={`testimonial-card ${t.approved ? '' : 'testimonial-card--pending'}`}>
                            <div className="testimonial-card__header">
                                <div>
                                    <strong className="testimonial-card__author">{t.author}</strong>
                                    <span className="testimonial-card__role">{t.role}</span>
                                    {t.featured && <span className="testimonial-card__featured">Featured</span>}
                                </div>
                                <div className="testimonial-card__status-wrap">
                                    <span className={`admin-badge ${t.approved ? 'admin-badge--success' : 'admin-badge--danger'}`}>{t.approved ? 'Approved' : 'Pending'}</span>
                                </div>
                            </div>
                            <div className="testimonial-card__stars">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
                            <p className="testimonial-card__text">&quot;{t.text}&quot;</p>
                            <div className="testimonial-card__actions">
                                <button className={`btn btn--ghost btn--sm testimonial-btn-approve ${t.approved ? 'testimonial-btn-approve--reject' : ''}`} onClick={() => toggleTestimonialApproval(t)}>{t.approved ? 'Reject' : 'Approve'}</button>
                                <button className={`btn btn--ghost btn--sm testimonial-btn-feature ${t.featured ? 'testimonial-btn-feature--muted' : ''}`} onClick={() => toggleTestimonialFeatured(t)}>{t.featured ? 'Unfeature' : '★ Feature'}</button>
                                <button className="btn btn--ghost btn--sm" onClick={() => openEditTestimonial(t)}>Edit</button>
                                <button className="btn btn--ghost btn--sm admin-btn-danger" onClick={() => deleteTestimonial(t._id)}>Delete</button>
                                <span className="testimonial-card__meta">Order: {t.order} · {new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
