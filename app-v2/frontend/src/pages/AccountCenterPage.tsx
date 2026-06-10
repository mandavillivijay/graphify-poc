import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

type ProfileForm = {
  name: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type ActiveTab = 'profile' | 'addresses' | 'security';

const AccountCenterPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  const [form, setForm] = useState<ProfileForm>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    addressLine1: user?.addressLine1 ?? '',
    city: user?.city ?? '',
    state: user?.state ?? '',
    zip: user?.zip ?? '',
    country: user?.country ?? '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const updateData: Partial<User> = {
        name: form.name,
        phone: form.phone || undefined,
        addressLine1: form.addressLine1 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zip: form.zip || undefined,
        country: form.country || undefined,
      };
      await updateProfile(updateData);
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: isEditing ? '#fff' : '#f9fafb',
  };

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 500, fontSize: '13px', color: '#374151' };
  const fieldStyle: React.CSSProperties = { marginBottom: '14px' };

  const TAB_OPTIONS: { key: ActiveTab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'security', label: 'Security' },
  ];

  const renderProfile = () => (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Personal Details</h2>
        {!isEditing && (
          <button
            onClick={() => { setIsEditing(true); setError(''); }}
            style={{ padding: '8px 16px', border: '1px solid #4f46e5', color: '#4f46e5', background: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            Edit
          </button>
        )}
      </div>

      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="name">Full Name</label>
          <input id="name" name="name" type="text" value={form.name} onChange={handleChange} style={inputStyle} readOnly={!isEditing} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Email Address</label>
          <input type="email" value={user?.email ?? ''} style={{ ...inputStyle, backgroundColor: '#f3f4f6', color: '#6b7280' }} readOnly disabled />
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>Email cannot be changed</p>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="phone">Phone Number</label>
          <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Optional" style={inputStyle} readOnly={!isEditing} />
        </div>

        {isEditing && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ flex: 1, padding: '11px', backgroundColor: isSubmitting ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => { setIsEditing(false); setError(''); }}
              style={{ flex: 1, padding: '11px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );

  const renderAddresses = () => (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Saved Addresses</h2>
        {!isEditing && (
          <button
            onClick={() => { setIsEditing(true); setError(''); }}
            style={{ padding: '8px 16px', border: '1px solid #4f46e5', color: '#4f46e5', background: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            Edit
          </button>
        )}
      </div>
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {successMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="addressLine1">Street Address</label>
          <input id="addressLine1" name="addressLine1" type="text" value={form.addressLine1} onChange={handleChange} placeholder="Optional" style={inputStyle} readOnly={!isEditing} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ ...fieldStyle, flex: 2 }}>
            <label style={labelStyle} htmlFor="city">City</label>
            <input id="city" name="city" type="text" value={form.city} onChange={handleChange} placeholder="Optional" style={inputStyle} readOnly={!isEditing} />
          </div>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle} htmlFor="state">State</label>
            <input id="state" name="state" type="text" value={form.state} onChange={handleChange} placeholder="Optional" style={inputStyle} readOnly={!isEditing} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle} htmlFor="zip">ZIP Code</label>
            <input id="zip" name="zip" type="text" value={form.zip} onChange={handleChange} placeholder="Optional" style={inputStyle} readOnly={!isEditing} />
          </div>
          <div style={{ ...fieldStyle, flex: 2 }}>
            <label style={labelStyle} htmlFor="country">Country</label>
            <input id="country" name="country" type="text" value={form.country} onChange={handleChange} placeholder="Optional" style={inputStyle} readOnly={!isEditing} />
          </div>
        </div>
        {isEditing && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ flex: 1, padding: '11px', backgroundColor: isSubmitting ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? 'Saving...' : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={() => { setIsEditing(false); setError(''); }}
              style={{ flex: 1, padding: '11px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );

  const renderSecurity = () => (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '18px', color: '#111827' }}>Security</h2>
      <div
        data-testid="security-placeholder"
        style={{ padding: '40px 24px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', fontWeight: 500 }}>Change password coming soon</p>
        <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: '13px' }}>Password management features are under development.</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '700px', margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '24px' }}>Account Center</h1>

      {/* Account Info Card */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '60px', height: '60px', backgroundColor: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '18px', color: '#111827' }}>{user?.name}</p>
            <p style={{ margin: '0 0 2px', fontSize: '14px', color: '#6b7280' }}>{user?.email}</p>
            <span style={{ display: 'inline-block', padding: '2px 10px', backgroundColor: user?.role === 'admin' ? '#fef9c3' : '#ede9fe', color: user?.role === 'admin' ? '#92400e' : '#5b21b6', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {user?.role === 'admin' ? 'Administrator' : 'Customer'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        data-testid="account-center-tabs"
        style={{ display: 'flex', gap: '0', marginBottom: '16px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}
      >
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => { setActiveTab(tab.key); setIsEditing(false); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #4f46e5' : '3px solid transparent',
              backgroundColor: activeTab === tab.key ? '#f5f3ff' : '#fff',
              color: activeTab === tab.key ? '#4f46e5' : '#374151',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'addresses' && renderAddresses()}
      {activeTab === 'security' && renderSecurity()}
    </div>
  );
};

export default AccountCenterPage;
