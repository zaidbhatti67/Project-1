import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  FileText, 
  Grid, 
  Presentation, 
  Search, 
  Folder, 
  Settings, 
  Home, 
  Trash2, 
  Star, 
  Share2, 
  Bell, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Activity, 
  Clock, 
  LogOut,
  FolderPlus,
  Copy,
  ChevronLeft,
  HardDrive
} from 'lucide-react';

export default function Dashboard({ 
  documents = [], 
  onCreateDoc, 
  onOpenDoc, 
  onToggleFavorite, 
  onOpenSettings,
  onAddToast,
  foldersList = [],
  onLogout,
  onMoveFile
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('home'); // 'home', 'favorites', 'shared', 'trash'
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [folders, setFolders] = useState(foldersList);

  // Sync folders from props
  useEffect(() => {
    setFolders(foldersList);
  }, [foldersList]);

  // Folder creation trigger
  const handleCreateFolderClick = async () => {
    const folderName = prompt('Enter a name for the new folder:');
    if (!folderName || !folderName.trim()) return;

    try {
      const newFolder = await api.createFolder(folderName.trim(), currentFolderId);
      setFolders(prev => [...prev, newFolder]);
      if (onAddToast) {
        onAddToast('Folder Created', `Folder "${folderName}" created successfully.`, 'success');
      }
    } catch (err) {
      if (onAddToast) onAddToast('Error', err.message, 'error');
    }
  };

  const handleDuplicateFile = async (e, id) => {
    e.stopPropagation();
    try {
      await api.duplicateFile(id);
      if (onAddToast) onAddToast('Duplicated', 'File copy created successfully.', 'success');
    } catch (err) {
      if (onAddToast) onAddToast('Error', err.message, 'error');
    }
  };

  const handleDeleteFile = async (e, id) => {
    e.stopPropagation();
    const conf = window.confirm('Are you sure you want to delete this document permanently?');
    if (!conf) return;

    try {
      await api.deleteFile(id);
      if (onAddToast) onAddToast('Deleted', 'File deleted permanently.', 'success');
    } catch (err) {
      if (onAddToast) onAddToast('Error', err.message, 'error');
    }
  };

  const handleDeleteFolder = async (e, id) => {
    e.stopPropagation();
    const conf = window.confirm('Are you sure you want to delete this folder and all its contents?');
    if (!conf) return;

    try {
      await api.deleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (onAddToast) onAddToast('Folder Deleted', 'Folder removed successfully.', 'success');
    } catch (err) {
      if (onAddToast) onAddToast('Error', err.message, 'error');
    }
  };

  const handleCreateFileClick = (type) => {
    onCreateDoc(type, null, currentFolderId);
    setIsNewMenuOpen(false);
  };

  // breadcrumb helper
  const getBreadcrumbs = () => {
    if (!currentFolderId) return [{ id: null, name: 'Root' }];
    const trail = [];
    let current = folders.find(f => f.id === currentFolderId);
    while (current) {
      trail.unshift({ id: current.id, name: current.name });
      current = folders.find(f => f.id === current.parentId);
    }
    trail.unshift({ id: null, name: 'Root' });
    return trail;
  };

  // Filter folders and files based on category and current folder
  const currentFolders = folders.filter(f => {
    if (activeCategory !== 'home') return false; // Show folders only in Home portal
    return f.parentId === currentFolderId;
  });

  const currentFiles = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory === 'favorites') return doc.isFavorite;
    if (activeCategory === 'shared') return doc.ownerId !== doc.ownerId; // Dummy shared check
    
    // In Home view, filter files inside active folder
    if (activeCategory === 'home') {
      return doc.folderId === currentFolderId;
    }
    return true;
  });

  const getDocBrandIcon = (type, size = 16) => {
    switch (type) {
      case 'docs': return <FileText size={size} style={{ color: 'var(--n-docs)' }} />;
      case 'sheets': return <Grid size={size} style={{ color: 'var(--n-sheets)' }} />;
      case 'slides': return <Presentation size={size} style={{ color: 'var(--n-slides)' }} />;
      default: return <Folder size={size} />;
    }
  };

  const formatTime = (timeMs) => {
    if (!timeMs) return 'Just now';
    const date = new Date(timeMs);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container animate-fade">
      
      {/* LEFT SIDEBAR */}
      <aside className="n-sidebar">
        <div className="n-sidebar-brand">
          <div className="n-brand-icon">✦</div>
          <span className="n-brand-name">Nexus Suite</span>
        </div>

        {/* Workspace Switcher */}
        <div className="n-workspace-switcher" onClick={() => onAddToast && onAddToast('Switcher', 'Default Workspace active.', 'info')}>
          <div className="n-workspace-details">
            <span className="n-workspace-title">Main Portal Directory</span>
            <span className="n-workspace-subtitle">Team Cloud Sync</span>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--n-text-light)' }} />
        </div>

        {/* Sidebar Navigation */}
        <nav className="n-sidebar-menu">
          <span className="n-menu-label">Workspace</span>
          <button 
            type="button" 
            onClick={() => { setActiveCategory('home'); setCurrentFolderId(null); }}
            className={`n-nav-item ${activeCategory === 'home' ? 'active' : ''}`}
          >
            <Home size={15} />
            <span>Files & Folders</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => setActiveCategory('favorites')}
            className={`n-nav-item ${activeCategory === 'favorites' ? 'active' : ''}`}
          >
            <Star size={15} />
            <span>Starred Files</span>
          </button>

          <button 
            type="button" 
            onClick={() => setActiveCategory('shared')}
            className={`n-nav-item ${activeCategory === 'shared' ? 'active' : ''}`}
          >
            <Share2 size={15} />
            <span>Shared with me</span>
          </button>

          <span className="n-menu-label">Module shortcuts</span>
          <button type="button" onClick={() => handleCreateFileClick('docs')} className="n-nav-item">
            <FileText size={15} style={{ color: 'var(--n-docs)' }} />
            <span>New Document</span>
          </button>
          <button type="button" onClick={() => handleCreateFileClick('sheets')} className="n-nav-item">
            <Grid size={15} style={{ color: 'var(--n-sheets)' }} />
            <span>New Spreadsheet</span>
          </button>
          <button type="button" onClick={() => handleCreateFileClick('slides')} className="n-nav-item">
            <Presentation size={15} style={{ color: 'var(--n-slides)' }} />
            <span>New Presentation</span>
          </button>

          <span className="n-menu-label">Account</span>
          <button type="button" onClick={onOpenSettings} className="n-nav-item">
            <Settings size={15} />
            <span>System Settings</span>
          </button>
          <button type="button" onClick={onLogout} className="n-nav-item" style={{ color: 'var(--n-error)' }}>
            <LogOut size={15} />
            <span>Logout session</span>
          </button>
        </nav>

        {/* Storage Indicator */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--n-border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--n-text-sub)', marginBottom: '6px' }}>
            <HardDrive size={13} />
            <span>Storage Usage</span>
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--n-primary)', width: '1.2%', height: '100%' }} />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--n-text-light)', marginTop: '4px', display: 'block' }}>
            1.2 MB of 100 MB used (1%)
          </span>
        </div>
      </aside>

      {/* MAIN MAIN COLUMN */}
      <main className="n-main-column">
        
        {/* TOP HEADER */}
        <header className="n-top-nav">
          <div className="n-top-left-actions">
            {/* Search Bar */}
            <div className="n-search-bar">
              <Search size={16} style={{ color: 'var(--n-text-light)' }} />
              <input
                type="text"
                placeholder="Search documents and workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="n-search-input"
              />
              <span className="n-shortcut-badge">⌘K</span>
            </div>

            {/* "+ New" Dropdown button */}
            <div style={{ position: 'relative' }}>
              <button 
                type="button" 
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="n-btn-primary"
              >
                <Plus size={15} />
                New Workspace
                <ChevronDown size={12} />
              </button>

              {isNewMenuOpen && (
                <div 
                  className="animate-slide"
                  style={{ 
                    position: 'absolute', 
                    top: '42px', 
                    left: '0', 
                    background: 'white', 
                    border: '1px solid var(--n-border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    width: '185px',
                    padding: '6px',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <button onClick={() => handleCreateFileClick('docs')} className="n-nav-item" style={{ padding: '8px 10px', fontSize: '12.5px' }}>
                    <FileText size={14} style={{ color: 'var(--n-docs)', marginRight: '6px' }} />
                    New Document
                  </button>
                  <button onClick={() => handleCreateFileClick('sheets')} className="n-nav-item" style={{ padding: '8px 10px', fontSize: '12.5px' }}>
                    <Grid size={14} style={{ color: 'var(--n-sheets)', marginRight: '6px' }} />
                    New Spreadsheet
                  </button>
                  <button onClick={() => handleCreateFileClick('slides')} className="n-nav-item" style={{ padding: '8px 10px', fontSize: '12.5px' }}>
                    <Presentation size={14} style={{ color: 'var(--n-slides)', marginRight: '6px' }} />
                    New Presentation
                  </button>
                  <div style={{ height: '1px', background: 'var(--n-border)', margin: '4px 0' }} />
                  <button onClick={handleCreateFolderClick} className="n-nav-item" style={{ padding: '8px 10px', fontSize: '12.5px' }}>
                    <FolderPlus size={14} style={{ color: 'var(--n-primary)', marginRight: '6px' }} />
                    New Folder
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="n-top-right-actions">
            <button 
              type="button" 
              onClick={() => onAddToast && onAddToast('Notifications', 'System online and synchronized.', 'success')}
              className="n-icon-btn n-icon-btn-badge"
            >
              <Bell size={18} />
              <div className="n-badge-dot" />
            </button>
            <div className="n-user-profile" onClick={onOpenSettings}>
              <div className="n-avatar">Z</div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--n-text-main)', paddingRight: '8px' }}>User Portal</span>
            </div>
          </div>
        </header>

        {/* CONTENT SCROLL */}
        <div className="n-dashboard-content">
          
          {/* Welcome Banner */}
          <div className="n-hero-section animate-slide">
            <h1 className="n-hero-title">Nexus Cloud Storage</h1>
            <p className="n-hero-subtitle">
              Manage nested directories, share document links, and duplicate sheets with database support. 
              Changes synchronize instantly using web-socket channels.
            </p>
          </div>



          {/* Breadcrumb Navigation Trail */}
          {activeCategory === 'home' && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '13px', 
                color: 'var(--n-text-sub)',
                marginBottom: '20px',
                background: 'white',
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid var(--n-border)'
              }}
            >
              <span style={{ fontWeight: '600' }}>Breadcrumbs:</span>
              {getBreadcrumbs().map((b, i) => (
                <React.Fragment key={b.id || 'root'}>
                  {i > 0 && <ChevronRight size={14} style={{ color: 'var(--n-text-light)' }} />}
                  <span 
                    onClick={() => setCurrentFolderId(b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fileId = e.dataTransfer.getData('text/plain');
                      if (fileId && onMoveFile) {
                        onMoveFile(fileId, b.id);
                      }
                    }}
                    className="n-breadcrumb-dropzone"
                    style={{ 
                      cursor: 'pointer', 
                      color: b.id === currentFolderId ? 'var(--n-primary)' : 'inherit',
                      fontWeight: b.id === currentFolderId ? '600' : 'normal',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {b.name}
                  </span>
                </React.Fragment>
              ))}
              
              {currentFolderId && (
                <button 
                  onClick={() => {
                    const parentFolder = folders.find(f => f.id === currentFolderId);
                    setCurrentFolderId(parentFolder ? parentFolder.parentId : null);
                  }}
                  style={{ 
                    marginLeft: 'auto', 
                    background: 'transparent', 
                    border: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--n-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={13} />
                  Up one level
                </button>
              )}
            </div>
          )}

          {/* Folders Grid */}
          {activeCategory === 'home' && currentFolders.length > 0 && (
            <>
              <span className="properties-label" style={{ display: 'block', marginBottom: '10px' }}>Folders</span>
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '28px' 
                }}
              >
                {currentFolders.map((f) => (
                  <div
                    key={f.id}
                    onDoubleClick={() => setCurrentFolderId(f.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fileId = e.dataTransfer.getData('text/plain');
                      if (fileId && onMoveFile) {
                        onMoveFile(fileId, f.id);
                      }
                    }}
                    className="n-folder-dropzone"
                    style={{
                      background: 'white',
                      border: '1px solid var(--n-border)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    title="Double click to enter folder (or Drag & Drop a workspace here)"
                  >
                    <Folder size={18} style={{ color: 'var(--n-primary)', fill: 'var(--n-primary-light)' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {f.name}
                    </span>
                    <button 
                      onClick={(e) => handleDeleteFolder(e, f.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--n-text-light)', cursor: 'pointer' }}
                      title="Delete Folder"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Files Grid Section */}
          <span className="properties-label" style={{ display: 'block', marginBottom: '10px' }}>Workspaces</span>
          <div className="n-files-grid">
            {currentFiles.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => onOpenDoc(doc.id)}
                className="n-file-card animate-slide"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', doc.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                {/* Favorite Star */}
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(doc.id); }}
                  className={`n-card-favorite-btn ${doc.isFavorite ? 'active' : ''}`}
                  type="button"
                >
                  <Star size={13} />
                </button>

                {/* Preview Thumbnail */}
                <div className="n-file-thumb">
                  <div className="n-file-snippet">
                    <div className="n-snippet-line-title" />
                    <div className="n-snippet-line-body" />
                  </div>
                  <div className="n-file-revision-badge">v{doc.revision || 10}</div>
                </div>

                {/* Details Footer */}
                <div className="n-file-card-details">
                  <div className="n-file-title-row">
                    <div className="n-file-brand-icon">
                      {getDocBrandIcon(doc.type, 13)}
                    </div>
                    <span className="n-file-name">{doc.name}</span>
                  </div>
                  
                  <div className="n-file-meta-row">
                    <span>{formatTime(doc.updatedAt)}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={(e) => handleDuplicateFile(e, doc.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--n-text-light)', cursor: 'pointer' }}
                        title="Duplicate File"
                      >
                        <Copy size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteFile(e, doc.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--n-text-light)', cursor: 'pointer' }}
                        title="Delete File"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {currentFiles.length === 0 && currentFolders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-text-light)', fontSize: '13px', fontStyle: 'italic' }}>
              This folder directory is empty. Create a document or new folder inside!
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
