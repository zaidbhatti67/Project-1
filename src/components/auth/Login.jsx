import React, { useState } from 'react';
import { api } from '../../services/api';
import { Shield, Mail, Lock } from 'lucide-react';

export default function Login({ onAuthSuccess, onToggleRegister, onAddToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      if (onAddToast) onAddToast('Missing parameters', 'Please provide email and password details.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_user', JSON.stringify(data.user));
      
      if (onAddToast) {
        onAddToast('Welcome back', `Logged in successfully as ${data.user.name}.`, 'success');
      }
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      if (onAddToast) {
        onAddToast('Login Failed', err.message || 'Invalid credentials.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPass = () => {
    if (onAddToast) {
      onAddToast('Verification Mail', 'A password reset link was sent to your email address (mock).', 'success');
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div className="n-brand-icon" style={{ width: '48px', height: '48px', fontSize: '24px', marginBottom: '10px' }}>✦</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Sign In to Nexus</h2>
          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>University Collaboration Suite</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="properties-label" style={{ fontSize: '11px' }}>Email Address</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={14} style={{ position: 'absolute', left: '12px', color: 'var(--n-text-light)' }} />
              <input
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="n-gemini-input"
                style={{ paddingLeft: '34px', width: '100%', fontSize: '12.5px', height: '38px', borderRadius: '10px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="properties-label" style={{ fontSize: '11px' }}>Password</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--n-text-light)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="n-gemini-input"
                style={{ paddingLeft: '34px', width: '100%', fontSize: '12.5px', height: '38px', borderRadius: '10px' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="n-btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', height: '38px', borderRadius: '10px', marginTop: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
          <span 
            onClick={handleForgotPass} 
            style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: '500' }}
          >
            Forgot Password?
          </span>
          <span style={{ color: '#64748b' }}>
            Don't have an account?{' '}
            <span 
              onClick={onToggleRegister} 
              style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: '600' }}
            >
              Sign Up
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
