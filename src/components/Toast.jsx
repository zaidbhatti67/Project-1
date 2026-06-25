import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts = [], onRemoveToast }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-emerald-500" />;
      case 'warning':
        return <AlertCircle size={16} className="text-amber-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-rose-500" />;
      default:
        return <Info size={16} className="text-indigo-500" />;
    }
  };

  return (
    <div className="n-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`n-toast-item ${toast.type || 'info'}`}>
          <div className="n-toast-icon">
            {getIcon(toast.type)}
          </div>
          <div className="n-toast-content">
            <span className="n-toast-title">{toast.title}</span>
            {toast.desc && <span className="n-toast-desc">{toast.desc}</span>}
          </div>
          <button 
            onClick={() => onRemoveToast(toast.id)}
            className="n-toast-close"
            type="button"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
