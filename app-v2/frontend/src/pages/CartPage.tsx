import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderSummary from '../components/OrderSummary';

const TAX_RATE = 0.08;
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 5.99;

const CartPage: React.FC = () => {
  const { cart, itemCount, isLoading, updateItem, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{ color: '#374151' }}>Please log in to view your cart</h2>
        <Link to="/login" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', backgroundColor: '#4f46e5', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading && !cart) return <LoadingSpinner />;

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_COST;
  const total = subtotal + tax + shipping;

  const containerStyle: React.CSSProperties = { maxWidth: '900px', margin: '32px auto', padding: '0 16px' };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  };

  if (items.length === 0) {
    return (
      <div style={containerStyle}>
        <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '24px' }}>Your Cart</h1>
        <div style={{ textAlign: 'center', padding: '60px 24px', ...cardStyle }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <h3 style={{ color: '#374151', fontSize: '20px', marginBottom: '8px' }}>Your cart is empty</h3>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>Looks like you haven't added any items yet.</p>
          <Link to="/" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#4f46e5', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '24px' }}>
        Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h1>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Cart Items */}
        <div style={{ flex: '1 1 500px', ...cardStyle }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '20px',
                borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                alignItems: 'center',
              }}
            >
              {/* Image */}
              <div style={{ width: '72px', height: '72px', backgroundColor: '#f3f4f6', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '15px', color: '#111827' }}>{item.product.name}</p>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#6b7280' }}>{item.product.brand}</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#4f46e5', fontWeight: 600 }}>${item.priceAtAdd.toFixed(2)} each</p>
              </div>

              {/* Quantity */}
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => updateItem(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1 || isLoading}
                  style={{ padding: '6px 10px', background: '#f9fafb', border: 'none', cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', fontSize: '16px', color: '#374151' }}
                >
                  -
                </button>
                <span style={{ padding: '6px 12px', fontWeight: 600, fontSize: '15px', color: '#111827', minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
                <button
                  onClick={() => updateItem(item.id, item.quantity + 1)}
                  disabled={isLoading}
                  style={{ padding: '6px 10px', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#374151' }}
                >
                  +
                </button>
              </div>

              {/* Line Total */}
              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '16px', color: '#111827' }}>
                  ${(item.priceAtAdd * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={isLoading}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary — using shared component */}
        <div style={{ flex: '0 0 260px' }}>
          <OrderSummary
            items={items}
            subtotal={subtotal}
            tax={tax}
            shipping={shipping}
            total={total}
          />
          <button
            onClick={() => navigate('/checkout')}
            data-testid="checkout-btn"
            style={{ width: '100%', marginTop: '16px', padding: '13px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
          >
            Proceed to Checkout
          </button>
          <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '12px', color: '#6b7280', fontSize: '13px', textDecoration: 'none' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
