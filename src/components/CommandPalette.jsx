import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Grid, Presentation, Settings, Share2, Trash2, Home, Activity } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onAction }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = [
    { id: 'go-home', label: 'Go to Dashboard Portal', category: 'Navigation', icon: <Home size={14} />, shortcut: '⌥H' },
    { id: 'new-doc', label: 'Create New Document Workspace', category: 'Creation', icon: <FileText size={14} style={{ color: '#ec4899' }} />, shortcut: '⌥D' },
    { id: 'new-sheet', label: 'Create New Spreadsheet Workspace', category: 'Creation', icon: <Grid size={14} style={{ color: '#10b981' }} />, shortcut: '⌥S' },
    { id: 'new-slide', label: 'Create New Presentation Deck', category: 'Creation', icon: <Presentation size={14} style={{ color: '#f59e0b' }} />, shortcut: '⌥P' },
    { id: 'open-thesis', label: 'Open "Project Research Thesis"', category: 'Recent Files', icon: <FileText size={14} /> },
    { id: 'open-budget', label: 'Open "Project Budget & Cost Calculations"', category: 'Recent Files', icon: <Grid size={14} /> },
    { id: 'open-slides', label: 'Open "University Presentation Pitch"', category: 'Recent Files', icon: <Presentation size={14} /> },
    { id: 'open-settings', label: 'Configure System Settings', category: 'Preferences', icon: <Settings size={14} />, shortcut: '⌥,' },
    { id: 'open-share', label: 'Share Current Workspace', category: 'Collaboration', icon: <Share2 size={14} />, shortcut: '⌥S' },
    { id: 'clear-logs', label: 'Clear OT Server Activity Logs', category: 'Developer Tools', icon: <Activity size={14} />, shortcut: '⌥K' }
  ];

  const filtered = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          triggerAction(filtered[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  if (!isOpen) return null;

  const triggerAction = (id) => {
    onAction(id);
    onClose();
  };

  return (
    <div className="n-command-palette-overlay" onClick={onClose}>
      <div className="n-command-palette-box" onClick={(e) => e.stopPropagation()}>
        
        {/* Input box */}
        <div className="n-command-input-row">
          <Search size={18} style={{ color: 'var(--n-text-light)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search workspace..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="n-command-input"
          />
          <span className="n-shortcut-badge">ESC</span>
        </div>

        {/* Command list */}
        <div className="n-command-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--n-text-light)', fontSize: '13px', fontStyle: 'italic' }}>
              No matching commands or resources found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isFocused = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => triggerAction(cmd.id)}
                  className={`n-command-item ${isFocused ? 'focused' : ''}`}
                >
                  <div className="n-command-item-icon">{cmd.icon}</div>
                  <div className="n-command-item-label">{cmd.label}</div>
                  {cmd.shortcut && (
                    <span className="n-command-item-shortcut">{cmd.shortcut}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div 
          style={{ 
            padding: '10px 16px', 
            borderTop: '1px solid var(--n-border)', 
            fontSize: '11px', 
            color: 'var(--n-text-light)',
            display: 'flex',
            justifyContent: 'space-between',
            background: 'var(--n-bg-workspace)'
          }}
        >
          <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select</span>
          <span>Category: {filtered[selectedIndex]?.category || 'General'}</span>
        </div>

      </div>
    </div>
  );
}
