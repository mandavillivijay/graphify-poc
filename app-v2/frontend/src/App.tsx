import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import ProductListingPage from './pages/ProductListingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AccountCenterPage from './pages/AccountCenterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<ProductListingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              {/* Checkout is accessible to all (supports guest checkout) */}
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrderHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />
              {/* /account is the new Account Center */}
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountCenterPage />
                  </ProtectedRoute>
                }
              />
              {/* /profile redirects to /account for backwards compatibility */}
              <Route path="/profile" element={<Navigate to="/account" replace />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
