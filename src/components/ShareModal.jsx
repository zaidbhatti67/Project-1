import React, { useState } from 'react';
import { Mail, Globe, Link, X, Check, Shield, UserPlus } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, docName, otEngine, onAddToast }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [collaborators, setCollaborators] = useState([
    { id: 1, name: 'You', email: 'you@university.edu', role: 'owner', avatarBg: '#818cf8' },
    { id: 2, name: 'Alice', email: 'alice@collab.org', role: 'editor', avatarBg: '#ec4899' },
    { id: 3, name: 'Charlie', email: 'charlie@collab.org', role: 'viewer', avatarBg: '#f59e0b' }
  ]);
  const [generalAccess, setGeneralAccess] = useState('restricted'); // 'restricted' or 'anyone'
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleAddCollaborator = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      if (onAddToast) onAddToast('Invalid email', 'Please provide a valid email address.', 'error');
      return;
    }

    const newCollab = {
      id: Date.now(),
      name: email.split('@')[0],
      email: email.trim(),
      role: role,
      avatarBg: '#94a3b8'
    };

    setCollaborators([...collaborators, newCollab]);
    setEmail('');
    
    if (otEngine) {
      otEngine.log(`Granted ${role} permission to "${email}"`, 'info');
    }

    if (onAddToast) {
      onAddToast('Access Granted', `${email} has been added as ${role}.`, 'success');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    if (onAddToast) {
      onAddToast('Link Copied', 'Project link copied to clipboard.', 'success');
    }
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="n-modal-overlay" onClick={onClose}>
      <div className="n-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="n-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ color: '#4f46e5' }}><Shield size={20} /></div>
            <span className="n-modal-title">Share "{docName || 'Workspace'}"</span>
          </div>
          <button className="n-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="n-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add People */}
          <form onSubmit={handleAddCollaborator} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="properties-label">Add collaborators</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Enter emails or usernames..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="n-gemini-input"
                  style={{ paddingLeft: '36px', width: '100%' }}
                />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="n-toolbar-select"
                style={{ height: '38px', borderRadius: '10px' }}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button 
                type="submit" 
                className="n-btn-primary" 
                style={{ padding: '8px 14px', borderRadius: '10px', height: '38px' }}
              >
                <UserPlus size={16} />
                Add
              </button>
            </div>
          </form>

          {/* People with Access */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="properties-label">People with access</span>
            <div style={{ display: 'flex', flexParagraph: 'column', flexDirection: 'column', gap: '12px' }}>
              {collaborators.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', gap: '12px' }}>
                  <div 
                    className="n-avatar" 
                    style={{ backgroundColor: c.avatarBg, width: '32px', height: '32px', fontSize: '11px', flexShrink: 0 }}
                  >
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{c.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{c.email}</span>
                  </div>
                  <span 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: c.role === 'owner' ? '#4f46e5' : '#475569',
                      background: c.role === 'owner' ? '#e0e7ff' : '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      textTransform: 'capitalize'
                    }}
                  >
                    {c.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* General Access */}
          <div style={{ borderTop: '1px solid var(--n-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="properties-label">General access</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: generalAccess === 'restricted' ? '#f1f5f9' : '#ecfdf5', 
                  color: generalAccess === 'restricted' ? '#64748b' : '#10b981',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0 
                }}
              >
                <Globe size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <select
                  value={generalAccess}
                  onChange={(e) => {
                    setGeneralAccess(e.target.value);
                    if (otEngine) {
                      otEngine.log(`Changed general access settings to "${e.target.value}"`, 'info');
                    }
                  }}
                  className="n-toolbar-select"
                  style={{ border: 'none', padding: '0px', fontWeight: '600', fontSize: '13px', width: 'fit-content' }}
                >
                  <option value="restricted">Restricted (Only added people)</option>
                  <option value="anyone">Anyone with link</option>
                </select>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {generalAccess === 'restricted' ? 'Only people added above can open this workspace link.' : 'Anyone on the internet with this link can view.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="n-modal-footer">
          <button 
            type="button" 
            className="n-nav-item" 
            onClick={handleCopyLink}
            style={{ padding: '6px 12px', fontSize: '12.5px', background: '#f1f5f9' }}
          >
            {isCopied ? <Check size={14} style={{ marginRight: '6px', color: '#22c55e' }} /> : <Link size={14} style={{ marginRight: '6px' }} />}
            {isCopied ? 'Copied!' : 'Copy link'}
          </button>
          <button 
            type="button" 
            className="n-btn-primary" 
            onClick={onClose}
            style={{ padding: '6px 16px', borderRadius: '10px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
