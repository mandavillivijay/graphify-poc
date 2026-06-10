import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import StarRating from './StarRating';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, isLoading } = useCart();
  const [added, setAdded] = React.useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    await addToCart(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
    display: 'flex',
    flexDirection: 'column',
  };

  const imagePlaceholderStyle: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1,
  };

  const outOfStock = product.stockQuantity === 0;

  return (
    <div
      style={cardStyle}
      onClick={() => navigate(`/products/${product.id}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '180px', objectFit: 'cover' }}
        />
      ) : (
        <div style={imagePlaceholderStyle}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        </div>
      )}
      <div style={bodyStyle}>
        <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {product.brand}
        </div>
        <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827', lineHeight: '1.3' }}>
          {product.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <StarRating rating={product.rating} size={14} />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>({product.reviewCount})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#4f46e5' }}>
            ${product.price.toFixed(2)}
          </span>
          {outOfStock && (
            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>Out of Stock</span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={outOfStock || isLoading}
          style={{
            marginTop: '8px',
            padding: '9px',
            backgroundColor: added ? '#10b981' : outOfStock ? '#e5e7eb' : '#4f46e5',
            color: outOfStock ? '#9ca3af' : '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: outOfStock ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'background 0.2s',
          }}
        >
          {added ? 'Added!' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
