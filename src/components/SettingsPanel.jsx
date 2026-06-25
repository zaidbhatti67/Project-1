import React, { useState, useEffect } from 'react';
import { Settings, X, Palette, User, Sliders, Moon, Sun, Check } from 'lucide-react';
import { api } from '../services/api';

import { safeStorage } from '../utils/storage';

export default function SettingsPanel({ isOpen, onClose, onAddToast, currentUser, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('general');
  const [autoSave, setAutoSave] = useState(true);
  const [theme, setTheme] = useState('light');
  const [zoom, setZoom] = useState('100');
  const [userProfile, setUserProfile] = useState({
    name: 'Zaid',
    email: 'zaid@university.edu',
    organization: 'Faculty of Computer Science'
  });

  useEffect(() => {
    if (isOpen) {
      setAutoSave(safeStorage.getItem('nexus_autosave') !== 'false');
      setTheme(safeStorage.getItem('nexus_theme') || 'light');
      setZoom(safeStorage.getItem('nexus_zoom') || '100');
      setUserProfile({
        name: currentUser?.name || 'Zaid',
        email: currentUser?.email || 'zaid@university.edu',
        organization: safeStorage.getItem('nexus_organization') || 'Faculty of Computer Science'
      });
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSaveSettings = async () => {
    try {
      safeStorage.setItem('nexus_autosave', String(autoSave));
      safeStorage.setItem('nexus_theme', theme);
      safeStorage.setItem('nexus_zoom', zoom);
      safeStorage.setItem('nexus_organization', userProfile.organization);

      // Apply theme immediately to HTML element
      document.documentElement.setAttribute('data-theme', theme);

      // Call backend PUT profile update
      if (api.updateProfile) {
        const result = await api.updateProfile(userProfile.name, userProfile.email);
        safeStorage.setItem('nexus_token', result.token);
        safeStorage.setItem('nexus_user', JSON.stringify(result.user));
        
        if (onUpdateUser) {
          onUpdateUser(result.user);
        }
      }

      if (onAddToast) {
        onAddToast('Settings Saved', 'Your system preferences have been updated.', 'success');
      }
      onClose();
    } catch (err) {
      if (onAddToast) {
        onAddToast('Update Failed', err.message, 'error');
      }
    }
  };

  return (
    <div className="n-modal-overlay" onClick={onClose}>
      <div className="n-modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="n-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} style={{ color: '#4f46e5' }} />
            <span className="n-modal-title">System Settings</span>
          </div>
          <button className="n-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="n-modal-body">
          <div className="settings-tabs-container">
            {/* Left navigation menu */}
            <div className="settings-nav-sidebar">
              <button 
                type="button"
                onClick={() => setActiveTab('general')}
                className={`settings-nav-btn ${activeTab === 'general' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Sliders size={15} />
                General
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('theme')}
                className={`settings-nav-btn ${activeTab === 'theme' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Palette size={15} />
                Theme
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('account')}
                className={`settings-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <User size={15} />
                Account
              </button>
            </div>

            {/* Vertical separator */}
            <div style={{ width: '1px', background: 'var(--n-border)' }} />

            {/* Right Pane content */}
            <div className="settings-content-pane">
              {activeTab === 'general' && (
                <>
                  <span className="properties-label">General Workspace Settings</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                    
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>Cloud Auto-save</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Automatically save work to database</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoSave}
                        onChange={(e) => setAutoSave(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                      />
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>Default Zoom Ratio</span>
                      <select 
                        value={zoom} 
                        onChange={(e) => setZoom(e.target.value)}
                        className="n-toolbar-select"
                        style={{ height: '36px', borderRadius: '8px' }}
                      >
                        <option value="90">90% Zoom (Compact)</option>
                        <option value="100">100% Zoom (Normal)</option>
                        <option value="110">110% Zoom (Large)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>Keyboard Layout</span>
                      <select 
                        className="n-toolbar-select"
                        style={{ height: '36px', borderRadius: '8px' }}
                        defaultValue="us"
                      >
                        <option value="us">United States (QWERTY)</option>
                        <option value="uk">United Kingdom (QWERTY)</option>
                        <option value="fr">France (AZERTY)</option>
                      </select>
                    </div>

                  </div>
                </>
              )}

              {activeTab === 'theme' && (
                <>
                  <span className="properties-label">Visual Themes</span>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                    
                    {/* Light theme card */}
                    <div 
                      onClick={() => setTheme('light')}
                      style={{ 
                        flex: 1, 
                        border: theme === 'light' ? '2px solid #4f46e5' : '1px solid var(--n-border)',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        padding: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        position: 'relative'
                      }}
                    >
                      <Sun size={20} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Warm Light</span>
                      {theme === 'light' && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#4f46e5' }}><Check size={14} /></div>
                      )}
                    </div>

                    {/* Dark theme card */}
                    <div 
                      onClick={() => setTheme('dark')}
                      style={{ 
                        flex: 1, 
                        border: theme === 'dark' ? '2px solid #4f46e5' : '1px solid var(--n-border)',
                        background: '#0f172a',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        position: 'relative'
                      }}
                    >
                      <Moon size={20} style={{ color: '#cbd5e1' }} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Dark Slate</span>
                      {theme === 'dark' && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#4f46e5' }}><Check size={14} /></div>
                      )}
                    </div>

                  </div>
                </>
              )}

              {activeTab === 'account' && (
                <>
                  <span className="properties-label">User Account Profile</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="n-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                        {userProfile.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>{userProfile.name}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>System Editor</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--n-border)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Email Address</span>
                      <input 
                        type="text" 
                        value={userProfile.email}
                        onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                        className="n-gemini-input" 
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Department / Institute</span>
                      <input 
                        type="text" 
                        value={userProfile.organization}
                        onChange={(e) => setUserProfile({ ...userProfile, organization: e.target.value })}
                        className="n-gemini-input" 
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      />
                    </div>

                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="n-modal-footer">
          <button 
            type="button" 
            className="n-nav-item" 
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: '12.5px', background: '#f1f5f9' }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="n-btn-primary" 
            onClick={handleSaveSettings}
            style={{ padding: '6px 16px', borderRadius: '10px' }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
