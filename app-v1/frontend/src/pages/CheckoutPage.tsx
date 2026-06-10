import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi, ShippingData } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const TAX_RATE = 0.08;
const SHIPPING_COST = 5.99;

interface FormState {
  shippingName: string;
  shippingEmail: string;
  shippingAddressLine1: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
}

const CheckoutPage: React.FC = () => {
  const { cart, clearCart, isLoading: cartLoading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    shippingName: user?.name ?? '',
    shippingEmail: user?.email ?? '',
    shippingAddressLine1: user?.addressLine1 ?? '',
    shippingCity: user?.city ?? '',
    shippingState: user?.state ?? '',
    shippingZip: user?.zip ?? '',
    shippingCountry: user?.country ?? 'US',
  });

  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successOrderId, setSuccessOrderId] = useState('');

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal >= 50 ? 0 : SHIPPING_COST;
  const total = subtotal + tax + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {};
    if (!form.shippingName.trim()) newErrors.shippingName = 'Name is required';
    if (!form.shippingEmail.trim() || !/\S+@\S+\.\S+/.test(form.shippingEmail)) newErrors.shippingEmail = 'Valid email is required';
    if (!form.shippingAddressLine1.trim()) newErrors.shippingAddressLine1 = 'Address is required';
    if (!form.shippingCity.trim()) newErrors.shippingCity = 'City is required';
    if (!form.shippingState.trim()) newErrors.shippingState = 'State is required';
    if (!form.shippingZip.trim()) newErrors.shippingZip = 'ZIP code is required';
    if (!form.shippingCountry.trim()) newErrors.shippingCountry = 'Country is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (items.length === 0) {
      setSubmitError('Your cart is empty.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const shippingData: ShippingData = { ...form };
      const order = await ordersApi.createOrder(shippingData);
      await clearCart();
      setSuccessOrderId(order.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${hasError ? '#f87171' : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: hasError ? '#fef2f2' : '#fff',
  });

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 500, fontSize: '13px', color: '#374151' };
  const fieldStyle: React.CSSProperties = { marginBottom: '14px' };
  const errorMsgStyle: React.CSSProperties = { color: '#dc2626', fontSize: '12px', marginTop: '4px' };

  if (cartLoading && !cart) return <LoadingSpinner />;

  if (successOrderId) {
    return (
      <div style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '16px', padding: '40px' }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ marginBottom: '16px' }}>
            <circle cx="12" cy="12" r="10" /><polyline points="9,12 12,15 16,9" />
          </svg>
          <h2 style={{ color: '#111827', marginBottom: '8px' }}>Order Placed!</h2>
          <p style={{ color: '#374151', marginBottom: '6px' }}>Your order has been confirmed.</p>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
            Order ID: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>{successOrderId.slice(0, 12)}...</strong>
          </p>
          <button onClick={() => navigate('/orders')} style={{ padding: '12px 24px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '24px' }}>Checkout</h1>

      {submitError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {submitError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Shipping Form */}
        <form onSubmit={handleSubmit} style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '28px' }} noValidate>
          <h2 style={{ margin: '0 0 20px', fontSize: '18px', color: '#111827' }}>Shipping Information</h2>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="shippingName">Full Name</label>
            <input id="shippingName" name="shippingName" type="text" value={form.shippingName} onChange={handleChange} style={inputStyle(!!errors.shippingName)} placeholder="John Doe" />
            {errors.shippingName && <p style={errorMsgStyle}>{errors.shippingName}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="shippingEmail">Email</label>
            <input id="shippingEmail" name="shippingEmail" type="email" value={form.shippingEmail} onChange={handleChange} style={inputStyle(!!errors.shippingEmail)} placeholder="you@example.com" />
            {errors.shippingEmail && <p style={errorMsgStyle}>{errors.shippingEmail}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="shippingAddressLine1">Street Address</label>
            <input id="shippingAddressLine1" name="shippingAddressLine1" type="text" value={form.shippingAddressLine1} onChange={handleChange} style={inputStyle(!!errors.shippingAddressLine1)} placeholder="123 Main St" />
            {errors.shippingAddressLine1 && <p style={errorMsgStyle}>{errors.shippingAddressLine1}</p>}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ ...fieldStyle, flex: 2 }}>
              <label style={labelStyle} htmlFor="shippingCity">City</label>
              <input id="shippingCity" name="shippingCity" type="text" value={form.shippingCity} onChange={handleChange} style={inputStyle(!!errors.shippingCity)} placeholder="New York" />
              {errors.shippingCity && <p style={errorMsgStyle}>{errors.shippingCity}</p>}
            </div>
            <div style={{ ...fieldStyle, flex: 1 }}>
              <label style={labelStyle} htmlFor="shippingState">State</label>
              <input id="shippingState" name="shippingState" type="text" value={form.shippingState} onChange={handleChange} style={inputStyle(!!errors.shippingState)} placeholder="NY" />
              {errors.shippingState && <p style={errorMsgStyle}>{errors.shippingState}</p>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ ...fieldStyle, flex: 1 }}>
              <label style={labelStyle} htmlFor="shippingZip">ZIP Code</label>
              <input id="shippingZip" name="shippingZip" type="text" value={form.shippingZip} onChange={handleChange} style={inputStyle(!!errors.shippingZip)} placeholder="10001" />
              {errors.shippingZip && <p style={errorMsgStyle}>{errors.shippingZip}</p>}
            </div>
            <div style={{ ...fieldStyle, flex: 2 }}>
              <label style={labelStyle} htmlFor="shippingCountry">Country</label>
              <input id="shippingCountry" name="shippingCountry" type="text" value={form.shippingCountry} onChange={handleChange} style={inputStyle(!!errors.shippingCountry)} placeholder="US" />
              {errors.shippingCountry && <p style={errorMsgStyle}>{errors.shippingCountry}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            style={{ width: '100%', marginTop: '8px', padding: '14px', backgroundColor: isSubmitting ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? 'Placing Order...' : `Place Order — $${total.toFixed(2)}`}
          </button>
        </form>

        {/* Order Summary */}
        <div style={{ flex: '0 0 280px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#111827' }}>Order Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#374151' }}>
                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.product.name} ×{item.quantity}
                </span>
                <span style={{ fontWeight: 500 }}>${(item.priceAtAdd * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
              <span>Tax</span><span>${tax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
              <span>Shipping</span><span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', color: '#111827', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
