import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navStyle: React.CSSProperties = {
    backgroundColor: '#4f46e5',
    color: '#fff',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '60px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  };

  const logoStyle: React.CSSProperties = {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  };

  const linkStyle: React.CSSProperties = {
    color: '#e0e7ff',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '15px',
    transition: 'background 0.2s',
  };

  const btnStyle: React.CSSProperties = {
    ...linkStyle,
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const cartBadgeStyle: React.CSSProperties = {
    backgroundColor: '#f59e0b',
    color: '#fff',
    borderRadius: '50%',
    padding: '2px 7px',
    fontSize: '12px',
    fontWeight: 700,
    marginLeft: '4px',
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>ShopHub</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Link to="/" style={linkStyle}>Home</Link>
        <Link to="/cart" style={linkStyle}>
          Cart
          {itemCount > 0 && <span style={cartBadgeStyle}>{itemCount}</span>}
        </Link>
        {user ? (
          <>
            <Link to="/orders" style={linkStyle}>Orders</Link>
            <Link to="/profile" style={linkStyle}>Profile</Link>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ ...linkStyle, color: '#fde68a' }}>Admin</Link>
            )}
            <button onClick={handleLogout} style={btnStyle}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyle}>Login</Link>
            <Link to="/register" style={{ ...linkStyle, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '6px' }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
