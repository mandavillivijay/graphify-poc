import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderSummary from '../components/OrderSummary';

const TAX_RATE = 0.08;
const SHIPPING_COST = 5.99;

type CheckoutMode = 'member' | 'guest';
type Step = 1 | 2 | 3;

interface ShippingForm {
  shippingName: string;
  shippingEmail: string;
  shippingAddressLine1: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
}

interface PaymentForm {
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardName: string;
}

const CheckoutPage: React.FC = () => {
  const { cart, clearCart, isLoading: cartLoading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>(user ? 'member' : 'guest');
  const [guestEmail, setGuestEmail] = useState('');

  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    shippingName: user?.name ?? '',
    shippingEmail: user?.email ?? '',
    shippingAddressLine1: user?.addressLine1 ?? '',
    shippingCity: user?.city ?? '',
    shippingState: user?.state ?? '',
    shippingZip: user?.zip ?? '',
    shippingCountry: user?.country ?? 'US',
  });

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardName: '',
  });

  const [shippingErrors, setShippingErrors] = useState<Partial<ShippingForm & { guestEmail: string }>>({});
  const [paymentErrors, setPaymentErrors] = useState<Partial<PaymentForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successOrderId, setSuccessOrderId] = useState('');

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal >= 50 ? 0 : SHIPPING_COST;
  const total = subtotal + tax + shipping;

  // ── Styles ──────────────────────────────────────────────────────────────────

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

  // ── Step indicator ───────────────────────────────────────────────────────────

  const STEPS = [
    { number: 1, label: 'Shipping' },
    { number: 2, label: 'Payment' },
    { number: 3, label: 'Review' },
  ];

  const StepIndicator = () => (
    <div
      data-testid="checkout-step-indicator"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', gap: '0' }}
    >
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.number}>
          <div
            data-testid={`step-indicator-${step.number}`}
            data-active={currentStep === step.number}
            data-completed={currentStep > step.number}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px',
                backgroundColor:
                  currentStep > step.number
                    ? '#16a34a'
                    : currentStep === step.number
                    ? '#4f46e5'
                    : '#e5e7eb',
                color: currentStep >= step.number ? '#fff' : '#6b7280',
              }}
            >
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: currentStep === step.number ? 600 : 400,
                color: currentStep === step.number ? '#4f46e5' : '#6b7280',
              }}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: '2px',
                backgroundColor: currentStep > step.number ? '#16a34a' : '#e5e7eb',
                margin: '0 8px',
                marginBottom: '22px',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Validation ───────────────────────────────────────────────────────────────

  const validateShipping = (): boolean => {
    const errors: Partial<ShippingForm & { guestEmail: string }> = {};
    if (!user && checkoutMode === 'guest') {
      if (!guestEmail.trim() || !/\S+@\S+\.\S+/.test(guestEmail)) {
        errors.guestEmail = 'Valid guest email is required';
      }
    }
    if (!shippingForm.shippingName.trim()) errors.shippingName = 'Name is required';
    if (!shippingForm.shippingEmail.trim() || !/\S+@\S+\.\S+/.test(shippingForm.shippingEmail)) {
      errors.shippingEmail = 'Valid email is required';
    }
    if (!shippingForm.shippingAddressLine1.trim()) errors.shippingAddressLine1 = 'Address is required';
    if (!shippingForm.shippingCity.trim()) errors.shippingCity = 'City is required';
    if (!shippingForm.shippingState.trim()) errors.shippingState = 'State is required';
    if (!shippingForm.shippingZip.trim()) errors.shippingZip = 'ZIP code is required';
    if (!shippingForm.shippingCountry.trim()) errors.shippingCountry = 'Country is required';
    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePayment = (): boolean => {
    const errors: Partial<PaymentForm> = {};
    if (!paymentForm.cardNumber.replace(/\s/g, '').match(/^\d{13,19}$/)) {
      errors.cardNumber = 'Valid card number is required';
    }
    if (!paymentForm.cardExpiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      errors.cardExpiry = 'Expiry must be MM/YY';
    }
    if (!paymentForm.cardCvv.match(/^\d{3,4}$/)) {
      errors.cardCvv = 'CVV must be 3-4 digits';
    }
    if (!paymentForm.cardName.trim()) {
      errors.cardName = 'Name on card is required';
    }
    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleShippingContinue = () => {
    if (!validateShipping()) return;
    setCurrentStep(2);
  };

  const handlePaymentContinue = () => {
    if (!validatePayment()) return;
    setCurrentStep(3);
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      setSubmitError('Your cart is empty.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const isGuest = !user && checkoutMode === 'guest';

      if (isGuest) {
        // Guest order via dedicated endpoint
        const order = await ordersApi.createGuestOrder({
          guestEmail,
          shipping: {
            name: shippingForm.shippingName,
            email: shippingForm.shippingEmail,
            address_line1: shippingForm.shippingAddressLine1,
            city: shippingForm.shippingCity,
            state: shippingForm.shippingState,
            zip: shippingForm.shippingZip,
            country: shippingForm.shippingCountry,
          },
          cartItems: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        });
        await clearCart();
        setSuccessOrderId(order.id);
      } else {
        // Authenticated order
        const order = await ordersApi.createOrder({
          shippingName: shippingForm.shippingName,
          shippingEmail: shippingForm.shippingEmail,
          shippingAddressLine1: shippingForm.shippingAddressLine1,
          shippingCity: shippingForm.shippingCity,
          shippingState: shippingForm.shippingState,
          shippingZip: shippingForm.shippingZip,
          shippingCountry: shippingForm.shippingCountry,
        });
        await clearCart();
        setSuccessOrderId(order.id);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Early returns ────────────────────────────────────────────────────────────

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
          <button
            onClick={() => navigate(user ? '/orders' : '/')}
            style={{ padding: '12px 24px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}
          >
            {user ? 'View My Orders' : 'Continue Shopping'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step renders ─────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div data-testid="checkout-step-1" style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '28px' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#111827' }}>Shipping Information</h2>

      {/* Guest / Member toggle (only when not authenticated) */}
      {!user && (
        <div data-testid="checkout-mode-toggle" style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Checkout as:</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              data-testid="checkout-as-member-btn"
              onClick={() => setCheckoutMode('member')}
              style={{
                padding: '8px 16px',
                border: `1px solid ${checkoutMode === 'member' ? '#4f46e5' : '#d1d5db'}`,
                borderRadius: '6px',
                backgroundColor: checkoutMode === 'member' ? '#4f46e5' : '#fff',
                color: checkoutMode === 'member' ? '#fff' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Sign In / Register
            </button>
            <button
              type="button"
              data-testid="checkout-as-guest-btn"
              onClick={() => setCheckoutMode('guest')}
              style={{
                padding: '8px 16px',
                border: `1px solid ${checkoutMode === 'guest' ? '#4f46e5' : '#d1d5db'}`,
                borderRadius: '6px',
                backgroundColor: checkoutMode === 'guest' ? '#4f46e5' : '#fff',
                color: checkoutMode === 'guest' ? '#fff' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Continue as Guest
            </button>
          </div>

          {checkoutMode === 'guest' && (
            <div style={{ marginTop: '12px' }}>
              <label style={labelStyle} htmlFor="guest-email">Guest Email</label>
              <input
                id="guest-email"
                data-testid="guest-email-input"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="your@email.com"
                style={inputStyle(!!(shippingErrors as Record<string, string>).guestEmail)}
              />
              {(shippingErrors as Record<string, string>).guestEmail && (
                <p style={errorMsgStyle}>{(shippingErrors as Record<string, string>).guestEmail}</p>
              )}
            </div>
          )}

          {checkoutMode === 'member' && (
            <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#6b7280' }}>
              <a href="/login" style={{ color: '#4f46e5' }}>Sign in</a> to access your saved addresses and order history.
            </p>
          )}
        </div>
      )}

      {/* Shipping fields */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="shippingName">Full Name</label>
        <input
          id="shippingName"
          name="shippingName"
          type="text"
          value={shippingForm.shippingName}
          onChange={(e) => setShippingForm((p) => ({ ...p, shippingName: e.target.value }))}
          style={inputStyle(!!shippingErrors.shippingName)}
          placeholder="John Doe"
        />
        {shippingErrors.shippingName && <p style={errorMsgStyle}>{shippingErrors.shippingName}</p>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="shippingEmail">Email</label>
        <input
          id="shippingEmail"
          name="shippingEmail"
          type="email"
          value={shippingForm.shippingEmail}
          onChange={(e) => setShippingForm((p) => ({ ...p, shippingEmail: e.target.value }))}
          style={inputStyle(!!shippingErrors.shippingEmail)}
          placeholder="you@example.com"
        />
        {shippingErrors.shippingEmail && <p style={errorMsgStyle}>{shippingErrors.shippingEmail}</p>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="shippingAddressLine1">Street Address</label>
        <input
          id="shippingAddressLine1"
          name="shippingAddressLine1"
          type="text"
          value={shippingForm.shippingAddressLine1}
          onChange={(e) => setShippingForm((p) => ({ ...p, shippingAddressLine1: e.target.value }))}
          style={inputStyle(!!shippingErrors.shippingAddressLine1)}
          placeholder="123 Main St"
        />
        {shippingErrors.shippingAddressLine1 && <p style={errorMsgStyle}>{shippingErrors.shippingAddressLine1}</p>}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ ...fieldStyle, flex: 2 }}>
          <label style={labelStyle} htmlFor="shippingCity">City</label>
          <input
            id="shippingCity"
            name="shippingCity"
            type="text"
            value={shippingForm.shippingCity}
            onChange={(e) => setShippingForm((p) => ({ ...p, shippingCity: e.target.value }))}
            style={inputStyle(!!shippingErrors.shippingCity)}
            placeholder="New York"
          />
          {shippingErrors.shippingCity && <p style={errorMsgStyle}>{shippingErrors.shippingCity}</p>}
        </div>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle} htmlFor="shippingState">State</label>
          <input
            id="shippingState"
            name="shippingState"
            type="text"
            value={shippingForm.shippingState}
            onChange={(e) => setShippingForm((p) => ({ ...p, shippingState: e.target.value }))}
            style={inputStyle(!!shippingErrors.shippingState)}
            placeholder="NY"
          />
          {shippingErrors.shippingState && <p style={errorMsgStyle}>{shippingErrors.shippingState}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle} htmlFor="shippingZip">ZIP Code</label>
          <input
            id="shippingZip"
            name="shippingZip"
            type="text"
            value={shippingForm.shippingZip}
            onChange={(e) => setShippingForm((p) => ({ ...p, shippingZip: e.target.value }))}
            style={inputStyle(!!shippingErrors.shippingZip)}
            placeholder="10001"
          />
          {shippingErrors.shippingZip && <p style={errorMsgStyle}>{shippingErrors.shippingZip}</p>}
        </div>
        <div style={{ ...fieldStyle, flex: 2 }}>
          <label style={labelStyle} htmlFor="shippingCountry">Country</label>
          <input
            id="shippingCountry"
            name="shippingCountry"
            type="text"
            value={shippingForm.shippingCountry}
            onChange={(e) => setShippingForm((p) => ({ ...p, shippingCountry: e.target.value }))}
            style={inputStyle(!!shippingErrors.shippingCountry)}
            placeholder="US"
          />
          {shippingErrors.shippingCountry && <p style={errorMsgStyle}>{shippingErrors.shippingCountry}</p>}
        </div>
      </div>

      <button
        type="button"
        data-testid="step1-continue-btn"
        onClick={handleShippingContinue}
        disabled={items.length === 0}
        style={{ width: '100%', marginTop: '8px', padding: '14px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}
      >
        Continue to Payment
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div data-testid="checkout-step-2" style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '28px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '18px', color: '#111827' }}>Payment Details</h2>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280', padding: '8px 12px', backgroundColor: '#fef9c3', borderRadius: '6px', border: '1px solid #fde68a' }}>
        This is a mock payment step. No real charges will be made.
      </p>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="card-number">Card Number</label>
        <input
          id="card-number"
          data-testid="card-number-input"
          type="text"
          value={paymentForm.cardNumber}
          onChange={(e) => setPaymentForm((p) => ({ ...p, cardNumber: e.target.value }))}
          style={inputStyle(!!paymentErrors.cardNumber)}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
        />
        {paymentErrors.cardNumber && <p style={errorMsgStyle}>{paymentErrors.cardNumber}</p>}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle} htmlFor="card-expiry">Expiry (MM/YY)</label>
          <input
            id="card-expiry"
            data-testid="card-expiry-input"
            type="text"
            value={paymentForm.cardExpiry}
            onChange={(e) => setPaymentForm((p) => ({ ...p, cardExpiry: e.target.value }))}
            style={inputStyle(!!paymentErrors.cardExpiry)}
            placeholder="12/27"
            maxLength={5}
          />
          {paymentErrors.cardExpiry && <p style={errorMsgStyle}>{paymentErrors.cardExpiry}</p>}
        </div>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle} htmlFor="card-cvv">CVV</label>
          <input
            id="card-cvv"
            data-testid="card-cvv-input"
            type="text"
            value={paymentForm.cardCvv}
            onChange={(e) => setPaymentForm((p) => ({ ...p, cardCvv: e.target.value }))}
            style={inputStyle(!!paymentErrors.cardCvv)}
            placeholder="123"
            maxLength={4}
          />
          {paymentErrors.cardCvv && <p style={errorMsgStyle}>{paymentErrors.cardCvv}</p>}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="card-name">Name on Card</label>
        <input
          id="card-name"
          data-testid="card-name-input"
          type="text"
          value={paymentForm.cardName}
          onChange={(e) => setPaymentForm((p) => ({ ...p, cardName: e.target.value }))}
          style={inputStyle(!!paymentErrors.cardName)}
          placeholder="John Doe"
        />
        {paymentErrors.cardName && <p style={errorMsgStyle}>{paymentErrors.cardName}</p>}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          type="button"
          data-testid="step2-back-btn"
          onClick={() => setCurrentStep(1)}
          style={{ flex: 1, padding: '14px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}
        >
          Back
        </button>
        <button
          type="button"
          data-testid="step2-continue-btn"
          onClick={handlePaymentContinue}
          style={{ flex: 2, padding: '14px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
        >
          Continue to Review
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div data-testid="checkout-step-3" style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '28px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '18px', color: '#111827' }}>Review Your Order</h2>

      {/* Shipping summary */}
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Shipping To:</p>
        <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
          {shippingForm.shippingName}<br />
          {shippingForm.shippingAddressLine1}<br />
          {shippingForm.shippingCity}, {shippingForm.shippingState} {shippingForm.shippingZip}<br />
          {shippingForm.shippingCountry}
        </p>
        {!user && checkoutMode === 'guest' && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Confirmation to: <strong>{guestEmail}</strong>
          </p>
        )}
      </div>

      {submitError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {submitError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          type="button"
          data-testid="step3-back-btn"
          onClick={() => setCurrentStep(2)}
          style={{ flex: 1, padding: '14px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}
        >
          Back
        </button>
        <button
          type="button"
          data-testid="place-order-btn"
          onClick={handlePlaceOrder}
          disabled={isSubmitting || items.length === 0}
          style={{ flex: 2, padding: '14px', backgroundColor: isSubmitting ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Placing Order...' : `Place Order — $${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '24px' }}>Checkout</h1>

      <StepIndicator />

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Current step content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Order Summary sidebar — uses shared OrderSummary component */}
        <div style={{ flex: '0 0 280px' }}>
          <OrderSummary
            items={items}
            subtotal={subtotal}
            tax={tax}
            shipping={shipping}
            total={total}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
