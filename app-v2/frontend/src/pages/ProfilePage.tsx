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

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();

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

  return (
    <div style={{ maxWidth: '600px', margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '24px' }}>My Profile</h1>

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

      {/* Edit Form */}
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
    </div>
  );
};

export default ProfilePage;
