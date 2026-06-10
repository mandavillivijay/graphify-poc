import React from 'react';
import { CartItem } from '../types';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  title?: string;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  subtotal,
  tax,
  shipping,
  total,
  title = 'Order Summary',
}) => {
  return (
    <div
      data-testid="order-summary"
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px',
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#111827' }}>{title}</h3>

      {/* Items list */}
      {items.length > 0 && (
        <div
          data-testid="order-summary-items"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#374151' }}
            >
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.product.name} &times;{item.quantity}
              </span>
              <span style={{ fontWeight: 500 }}>${(item.priceAtAdd * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Totals breakdown */}
      <div
        data-testid="order-summary-totals"
        style={{
          borderTop: items.length > 0 ? '1px solid #e5e7eb' : 'none',
          paddingTop: items.length > 0 ? '12px' : '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
          <span>Subtotal</span>
          <span data-testid="summary-subtotal">${subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
          <span>Tax</span>
          <span data-testid="summary-tax">${tax.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
          <span>Shipping</span>
          <span data-testid="summary-shipping">
            {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        {shipping === 0 && subtotal > 0 && (
          <p style={{ fontSize: '12px', color: '#16a34a', margin: '0' }}>
            Free shipping on orders over $50!
          </p>
        )}
        <div
          data-testid="summary-total"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '17px',
            color: '#111827',
            paddingTop: '8px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
