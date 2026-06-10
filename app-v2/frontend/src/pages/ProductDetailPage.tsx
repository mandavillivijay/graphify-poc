import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../services/api';
import { Product } from '../types';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, isLoading: cartLoading } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    productsApi.getProduct(id)
      .then(setProduct)
      .catch(() => setError('Product not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product) return;
    try {
      await addToCart(product.id, quantity);
      setCartMessage(`Added ${quantity} item(s) to cart!`);
      setTimeout(() => setCartMessage(''), 2500);
    } catch {
      setCartMessage('Failed to add to cart.');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error || !product) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <p style={{ color: '#ef4444', fontSize: '18px' }}>{error || 'Product not found.'}</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back to Products
        </button>
      </div>
    );
  }

  const outOfStock = product.stockQuantity === 0;

  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 16px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
        {/* Image */}
        <div style={{ flex: '0 0 320px', maxWidth: '320px' }}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', aspectRatio: '1' }}
            />
          ) : (
            <div style={{ width: '100%', aspectRatio: '1', backgroundColor: '#f3f4f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21,15 16,10 5,21" />
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px', fontWeight: 500 }}>
              {product.category}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', color: '#111827', lineHeight: '1.3' }}>{product.name}</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>by <strong>{product.brand}</strong></p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StarRating rating={product.rating} size={18} />
            <span style={{ fontSize: '14px', color: '#6b7280' }}>{product.rating.toFixed(1)} ({product.reviewCount} reviews)</span>
          </div>

          <div style={{ fontSize: '32px', fontWeight: 700, color: '#4f46e5' }}>
            ${product.price.toFixed(2)}
          </div>

          <div>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: outOfStock ? '#fef2f2' : '#f0fdf4',
              color: outOfStock ? '#dc2626' : '#16a34a',
            }}>
              {outOfStock ? 'Out of Stock' : `In Stock (${product.stockQuantity} available)`}
            </span>
          </div>

          <p style={{ color: '#374151', lineHeight: '1.6', margin: 0, fontSize: '15px' }}>
            {product.description}
          </p>

          {!outOfStock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>Qty:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{ padding: '8px 14px', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 600, color: '#374151' }}
                >
                  −
                </button>
                <span style={{ padding: '8px 16px', fontWeight: 600, fontSize: '16px', color: '#111827' }}>{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                  style={{ padding: '8px 14px', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 600, color: '#374151' }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {cartMessage && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }}>
              {cartMessage}
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={outOfStock || cartLoading}
            style={{
              padding: '14px',
              backgroundColor: outOfStock ? '#e5e7eb' : '#4f46e5',
              color: outOfStock ? '#9ca3af' : '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: outOfStock ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {cartLoading ? 'Adding...' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
