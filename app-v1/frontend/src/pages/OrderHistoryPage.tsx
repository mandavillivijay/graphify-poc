import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../services/api';
import { Order } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef9c3', color: '#92400e' },
  processing: { bg: '#dbeafe', color: '#1d4ed8' },
  shipped: { bg: '#e0f2fe', color: '#0369a1' },
  delivered: { bg: '#dcfce7', color: '#166534' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ordersApi.getOrders()
      .then(setOrders)
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ maxWidth: '800px', margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '24px' }}>My Orders</h1>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
          </svg>
          <h3 style={{ color: '#374151', marginBottom: '8px' }}>No orders yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>You haven't placed any orders.</p>
          <Link to="/" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#4f46e5', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map((order) => {
            const statusStyle = STATUS_COLORS[order.status.toLowerCase()] ?? { bg: '#f3f4f6', color: '#374151' };
            const date = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            return (
              <div
                key={order.id}
                style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}
              >
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6b7280' }}>Order ID</p>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>
                    {order.id.slice(0, 8)}...
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6b7280' }}>Date</p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>{date}</p>
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280' }}>Status</p>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: '90px', textAlign: 'right' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6b7280' }}>Total</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#111827' }}>${order.total.toFixed(2)}</p>
                </div>
                <div>
                  <Link
                    to={`/orders/${order.id}`}
                    style={{ display: 'inline-block', padding: '8px 16px', border: '1px solid #4f46e5', color: '#4f46e5', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage;
