import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../services/api';
import { Order } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderSummary from '../components/OrderSummary';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef9c3', color: '#92400e' },
  processing: { bg: '#dbeafe', color: '#1d4ed8' },
  shipped: { bg: '#e0f2fe', color: '#0369a1' },
  delivered: { bg: '#dcfce7', color: '#166534' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    ordersApi.getOrder(id)
      .then(setOrder)
      .catch(() => setError('Order not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpinner />;

  if (error || !order) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <p style={{ color: '#ef4444', fontSize: '18px' }}>{error || 'Order not found.'}</p>
        <button onClick={() => navigate('/orders')} style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back to Orders
        </button>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[order.status.toLowerCase()] ?? { bg: '#f3f4f6', color: '#374151' };
  const date = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '16px' };
  const sectionTitleStyle: React.CSSProperties = { margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#111827' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#6b7280', marginBottom: '2px' };
  const valueStyle: React.CSSProperties = { fontSize: '14px', color: '#374151', fontWeight: 500 };

  return (
    <div style={{ maxWidth: '800px', margin: '32px auto', padding: '0 16px' }}>
      <button
        onClick={() => navigate('/orders')}
        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
      >
        Back to Orders
      </button>

      {/* Header */}
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280' }}>Order ID</p>
          <p style={{ margin: '0 0 4px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 600, color: '#111827' }}>{order.id}</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{date}</p>
        </div>
        <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, backgroundColor: statusStyle.bg, color: statusStyle.color }}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Shipping Address */}
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>Shipping Address</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={labelStyle}>Name</p>
            <p style={valueStyle}>{order.shippingName}</p>
          </div>
          <div>
            <p style={labelStyle}>Email</p>
            <p style={valueStyle}>{order.shippingEmail}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={labelStyle}>Address</p>
            <p style={valueStyle}>
              {order.shippingAddressLine1}<br />
              {order.shippingCity}, {order.shippingState} {order.shippingZip}<br />
              {order.shippingCountry}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>Order Items</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Product</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Price</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 0', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{item.productName}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#374151' }}>${item.productPrice.toFixed(2)}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#374151' }}>{item.quantity}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#111827' }}>${item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* OrderSummary component replaces inline cost breakdown — pass empty items since the table above already lists them */}
      <div style={{ maxWidth: '300px', marginLeft: 'auto' }}>
        <OrderSummary
          items={[]}
          subtotal={order.subtotal}
          tax={order.tax}
          shipping={order.shippingCost}
          total={order.total}
          title="Cost Breakdown"
        />
      </div>
    </div>
  );
};

export default OrderDetailPage;
