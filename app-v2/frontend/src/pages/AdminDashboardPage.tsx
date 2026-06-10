import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';
import { Product, Order, AdminStats } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'products' | 'orders' | 'stats';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  brand: string;
  stockQuantity: string;
  imageUrl: string;
  isFeatured: boolean;
}

const EMPTY_FORM: ProductForm = { name: '', description: '', price: '', category: '', brand: '', stockQuantity: '', imageUrl: '', isFeatured: false };

const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try { setProducts(await adminApi.getProducts()); } catch { setError('Failed to load products.'); } finally { setIsLoading(false); }
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try { setOrders(await adminApi.getOrders()); } catch { setError('Failed to load orders.'); } finally { setIsLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try { setStats(await adminApi.getStats()); } catch { setError('Failed to load stats.'); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    setError('');
    if (activeTab === 'products') fetchProducts();
    else if (activeTab === 'orders') fetchOrders();
    else fetchStats();
  }, [activeTab, fetchProducts, fetchOrders, fetchStats]);

  const openAdd = () => { setEditingProduct(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, description: p.description, price: String(p.price), category: p.category, brand: p.brand, stockQuantity: String(p.stockQuantity), imageUrl: p.imageUrl ?? '', isFeatured: p.isFeatured });
    setFormError('');
    setShowForm(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price || !form.category.trim() || !form.brand.trim()) {
      setFormError('Name, price, category, and brand are required.');
      return;
    }
    setFormSubmitting(true);
    setFormError('');
    const data = {
      name: form.name, description: form.description, price: parseFloat(form.price),
      category: form.category, brand: form.brand, stockQuantity: parseInt(form.stockQuantity || '0', 10),
      imageUrl: form.imageUrl || undefined, isFeatured: form.isFeatured,
    };
    try {
      if (editingProduct) {
        const updated = await adminApi.updateProduct(editingProduct.id, data);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showSuccess('Product updated!');
      } else {
        const created = await adminApi.createProduct(data);
        setProducts((prev) => [created, ...prev]);
        showSuccess('Product created!');
      }
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Failed to save product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await adminApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showSuccess('Product deleted.');
    } catch { setError('Failed to delete product.'); }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const updated = await adminApi.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      showSuccess('Order status updated!');
    } catch { setError('Failed to update order status.'); }
  };

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 500,
    borderBottom: activeTab === tab ? '3px solid #4f46e5' : '3px solid transparent',
    color: activeTab === tab ? '#4f46e5' : '#6b7280', background: 'none',
  });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#374151' };

  return (
    <div style={{ maxWidth: '1100px', margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '8px' }}>Admin Dashboard</h1>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex' }}>
        <button style={tabStyle('products')} onClick={() => setActiveTab('products')}>Products</button>
        <button style={tabStyle('orders')} onClick={() => setActiveTab('orders')}>Orders</button>
        <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}>Stats</button>
      </div>

      {/* Alerts */}
      {error && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
      {successMsg && <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>{successMsg}</div>}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Products ({products.length})</h2>
            <button onClick={openAdd} style={{ padding: '9px 18px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
              + Add Product
            </button>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              {formError && <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>{formError}</div>}
              <form onSubmit={handleFormSubmit} noValidate>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input name="name" value={form.name} onChange={handleFormChange} style={inputStyle} placeholder="Product name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Brand *</label>
                    <input name="brand" value={form.brand} onChange={handleFormChange} style={inputStyle} placeholder="Brand" />
                  </div>
                  <div>
                    <label style={labelStyle}>Category *</label>
                    <input name="category" value={form.category} onChange={handleFormChange} style={inputStyle} placeholder="Category" />
                  </div>
                  <div>
                    <label style={labelStyle}>Price *</label>
                    <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleFormChange} style={inputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Stock Quantity</label>
                    <input name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={handleFormChange} style={inputStyle} placeholder="0" />
                  </div>
                  <div>
                    <label style={labelStyle}>Image URL</label>
                    <input name="imageUrl" value={form.imageUrl} onChange={handleFormChange} style={inputStyle} placeholder="https://..." />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Description</label>
                    <textarea name="description" value={form.description} onChange={handleFormChange} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="Product description..." />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" name="isFeatured" id="isFeatured" checked={form.isFeatured} onChange={handleFormChange} style={{ accentColor: '#4f46e5' }} />
                    <label htmlFor="isFeatured" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Featured Product</label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" disabled={formSubmitting} style={{ padding: '9px 20px', backgroundColor: formSubmitting ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: formSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px' }}>
                    {formSubmitting ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? <LoadingSpinner /> : (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    {['Name', 'Category', 'Brand', 'Price', 'Stock', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: '#111827', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{p.category}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{p.brand}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>${p.price.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <span style={{ color: p.stockQuantity === 0 ? '#ef4444' : '#16a34a', fontWeight: 500 }}>{p.stockQuantity}</span>
                      </td>
                      <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEdit(p)} style={{ padding: '5px 12px', border: '1px solid #4f46e5', color: '#4f46e5', background: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>Edit</button>
                        <button onClick={() => handleDelete(p.id)} style={{ padding: '5px 12px', border: '1px solid #ef4444', color: '#ef4444', background: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#111827' }}>All Orders ({orders.length})</h2>
          {isLoading ? <LoadingSpinner /> : (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    {['Order ID', 'Customer', 'Date', 'Total', 'Status', 'Update Status'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#374151' }}>{o.id.slice(0, 10)}...</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{o.shippingName}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>${o.total.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#374151' }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
                        >
                          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#111827' }}>Store Statistics</h2>
          {isLoading ? <LoadingSpinner /> : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Total Products', value: stats.totalProducts, color: '#4f46e5', icon: '📦' },
                { label: 'Total Orders', value: stats.totalOrders, color: '#0284c7', icon: '🛒' },
                { label: 'Total Users', value: stats.totalUsers, color: '#16a34a', icon: '👥' },
                { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, color: '#d97706', icon: '💰' },
              ].map((stat) => (
                <div key={stat.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>No stats available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
