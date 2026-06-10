import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const CATALOG_CATEGORIES = [
  { label: 'All Products', path: '/' },
  { label: 'Electronics', path: '/?category=Electronics' },
  { label: 'Clothing', path: '/?category=Clothing' },
  { label: 'Books', path: '/?category=Books' },
  { label: 'Home & Garden', path: '/?category=Home+%26+Garden' },
  { label: 'Sports', path: '/?category=Sports' },
];

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setCatalogOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
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

  const dropdownBtnStyle: React.CSSProperties = {
    ...linkStyle,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '0',
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: '180px',
    zIndex: 1001,
    overflow: 'hidden',
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'block',
    padding: '10px 16px',
    color: '#374151',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background 0.15s',
    cursor: 'pointer',
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
    <nav style={navStyle} data-testid="navbar">
      <Link to="/" style={logoStyle}>ShopHub</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Link to="/" style={linkStyle}>Home</Link>

        {/* Catalog Dropdown */}
        <div ref={catalogRef} style={{ position: 'relative' }}>
          <button
            data-testid="catalog-dropdown-btn"
            onClick={() => { setCatalogOpen((o) => !o); setUserMenuOpen(false); }}
            style={dropdownBtnStyle}
            aria-expanded={catalogOpen}
            aria-haspopup="true"
          >
            Catalog
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: catalogOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>

          {catalogOpen && (
            <div style={dropdownMenuStyle} data-testid="catalog-dropdown-menu">
              {CATALOG_CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  to={cat.path}
                  data-testid={`catalog-link-${cat.label.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, '')}`}
                  style={dropdownItemStyle}
                  onClick={() => setCatalogOpen(false)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Cart icon — standalone */}
        <Link to="/cart" style={linkStyle} data-testid="nav-cart-link">
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Cart
            {itemCount > 0 && <span style={cartBadgeStyle}>{itemCount}</span>}
          </span>
        </Link>

        {user ? (
          <>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ ...linkStyle, color: '#fde68a' }} data-testid="nav-admin-link">Admin</Link>
            )}

            {/* User dropdown — contains Account, Orders, Logout */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                data-testid="user-menu-btn"
                onClick={() => { setUserMenuOpen((o) => !o); setCatalogOpen(false); }}
                style={{
                  ...dropdownBtnStyle,
                  background: 'rgba(255,255,255,0.15)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                }}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name?.split(' ')[0]}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>

              {userMenuOpen && (
                <div
                  style={{ ...dropdownMenuStyle, right: '0', left: 'auto' }}
                  data-testid="user-dropdown-menu"
                >
                  <Link
                    to="/account"
                    data-testid="user-menu-account"
                    style={dropdownItemStyle}
                    onClick={() => setUserMenuOpen(false)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    My Account
                  </Link>
                  <Link
                    to="/orders"
                    data-testid="user-menu-orders"
                    style={dropdownItemStyle}
                    onClick={() => setUserMenuOpen(false)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    My Orders
                  </Link>
                  <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
                  <button
                    data-testid="user-menu-logout"
                    onClick={handleLogout}
                    style={{ ...dropdownItemStyle, width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', fontWeight: 500 }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyle} data-testid="nav-login-link">Login</Link>
            <Link to="/register" style={{ ...linkStyle, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '6px' }} data-testid="nav-register-link">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
