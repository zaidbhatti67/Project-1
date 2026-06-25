import React, { useState } from 'react';
import { api } from '../../services/api';
import { Mail, Lock, User } from 'lucide-react';

import { safeStorage } from '../../utils/storage';

export default function Register({ onAuthSuccess, onToggleLogin, onAddToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      if (onAddToast) onAddToast('Missing details', 'Please complete all required fields.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      if (onAddToast) onAddToast('Password mismatch', 'Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await api.register(email, password, name);
      safeStorage.setItem('nexus_token', data.token);
      safeStorage.setItem('nexus_user', JSON.stringify(data.user));
      
      if (onAddToast) {
        onAddToast('Account Created', `Successfully registered as ${data.user.name}.`, 'success');
      }
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      if (onAddToast) {
        onAddToast('Registration Error', err.message || 'Failed to register.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' 
      }}
    >
      <div 
        className="n-modal-box animate-slide" 
        style={{ 
          width: '400px', 
          padding: '32px', 
          boxShadow: 'var(--shadow-premium)', 
          borderRadius: '16px' 
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div className="n-brand-icon" style={{ width: '48px', height: '48px', fontSize: '24px', marginBottom: '8px' }}>✦</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Create Nexus Account</h2>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Start working on team thesis projects</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="properties-label" style={{ fontSize: '10px' }}>Full Name</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={14} style={{ position: 'absolute', left: '12px', color: 'var(--n-text-light)' }} />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="n-gemini-input"
                style={{ paddingLeft: '34px', width: '100%', fontSize: '12px', height: '36px', borderRadius: '8px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="properties-label" style={{ fontSize: '10px' }}>Email Address</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={14} style={{ position: 'absolute', left: '12px', color: 'var(--n-text-light)' }} />
              <input
                type="email"
                placeholder="john@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="n-gemini-input"
                style={{ paddingLeft: '34px', width: '100%', fontSize: '12px', height: '36px', borderRadius: '8px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="properties-label" style={{ fontSize: '10px' }}>Password</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--n-text-light)' }} />
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="n-gemini-input"
                style={{ paddingLeft: '34px', width: '100%', fontSize: '12px', height: '36px', borderRadius: '8px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="properties-label" style={{ fontSize: '10px' }}>Confirm Password</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--n-text-light)' }} />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="n-gemini-input"
                style={{ paddingLeft: '34px', width: '100%', fontSize: '12px', height: '36px', borderRadius: '8px' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="n-btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', height: '38px', borderRadius: '10px', marginTop: '6px' }}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', fontSize: '12px' }}>
          <span style={{ color: '#64748b' }}>
            Already have an account?{' '}
            <span 
              onClick={onToggleLogin} 
              style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: '600' }}
            >
              Sign In
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
