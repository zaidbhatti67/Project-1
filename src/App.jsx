import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { 
  connectSocket, 
  disconnectSocket, 
  emitContent, 
  emitCursor, 
  emitSelection, 
  emitElementDrag, 
  registerSocketListeners 
} from './services/socket';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import DocsEditor from './components/DocsEditor';
import SheetsEditor from './components/SheetsEditor';
import SheetsEditorLocal from './components/SheetsEditor'; // Fallback
import SlidesEditor from './components/SlidesEditor';
import CollabSimPanel from './components/CollabSimPanel';
import ShareModal from './components/ShareModal';
import SettingsPanel from './components/SettingsPanel';
import CommandPalette from './components/CommandPalette';
import Toast from './components/Toast';
import { OTEngine } from './engine/otEngine';

const otEngine = new OTEngine('nexus-suite-sync');

const dropdownStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  background: 'var(--n-bg-canvas)',
  border: '1px solid var(--n-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  display: 'flex',
  flexDirection: 'column',
  padding: '6px 0',
  minWidth: '175px',
  zIndex: 1000,
  animation: 'fadeIn 0.15s ease-out',
  overflow: 'hidden'
};

const dividerStyle = {
  height: '1px',
  background: 'var(--n-border)',
  margin: '4px 0'
};

const DropdownItem = ({ label, shortcut, onClick, danger }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? 'var(--n-primary-light)' : 'transparent',
        border: 'none',
        padding: '8px 16px',
        fontSize: '11px',
        textAlign: 'left',
        cursor: 'pointer',
        color: danger ? 'var(--n-error)' : (isHovered ? 'var(--n-primary)' : 'var(--n-text-sub)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        width: '100%',
        fontWeight: isHovered ? '600' : '400',
        transition: 'all 0.15s ease'
      }}
    >
      <span>{label}</span>
      {shortcut && <span style={{ opacity: 0.5, fontSize: '9px' }}>{shortcut}</span>}
    </button>
  );
};


import { 
  FileText, 
  Grid, 
  Presentation, 
  Activity, 
  Share2, 
  CheckCircle,
  LogOut,
  FolderOpen,
  ArrowLeft
} from 'lucide-react';

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('nexus_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('nexus_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  });
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or fileId
  const [activeDoc, setActiveDoc] = useState(null);
  const [isSimPanelOpen, setIsSimPanelOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  const handleToggleMenu = (e, menuName) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenu(prev => prev === menuName ? null : menuName);
  };

  // Modals state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);

  // Toasts state
  const [toasts, setToasts] = useState([]);
  
  // Real database folder tree & document variables
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeBots, setActiveBots] = useState({ Alice: false, Charlie: false });
  
  // Real-time synchronization cursor variables
  const [simulatedEdits, setSimulatedEdits] = useState({
    cursors: {},
    text: '',
    textDocId: '',
    selections: {},
    cells: {},
    sheetDocId: '',
    positions: {},
    slides: [],
    slideDocId: ''
  });

  // Toast Helper
  const handleAddToast = (title, desc, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, desc, type }]);
    setTimeout(() => handleRemoveToast(id), 4000);
  };

  const handleRemoveToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // JWT validation on startup
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('nexus_token');
      if (token) {
        try {
          const profile = await api.getProfile();
          setAuthToken(token);
          setCurrentUser(profile.user);
          localStorage.setItem('nexus_user', JSON.stringify(profile.user));
          loadWorkspaceData();
        } catch (err) {
          handleLogout();
        }
      }
    };
    checkSession();
  }, [authToken]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('nexus_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Load database metadata
  const loadWorkspaceData = async () => {
    try {
      const filesList = await api.getFiles();
      const foldersList = await api.getFolders();
      setDocuments(filesList);
      setFolders(foldersList);
    } catch (err) {
      console.warn("REST server is offline. Reverting to mock dashboard.", err);
    }
  };

  const handleAuthSuccess = (token, user) => {
    setAuthToken(token);
    setCurrentUser(user);
    loadWorkspaceData();
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setAuthToken(null);
    setCurrentUser(null);
    disconnectSocket();
    setCurrentView('dashboard');
    setActiveDoc(null);
  };

  // Keyboard shortcut listener (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateDocument = async (type, title, folderId = null) => {
    try {
      const name = title || `New Collaborative ${type === 'docs' ? 'Document' : type === 'sheets' ? 'Spreadsheet' : 'Presentation'}`;
      const newFile = await api.createFile(name, type, folderId);
      await loadWorkspaceData();
      handleOpenDocument(newFile.id);
    } catch (err) {
      handleAddToast('Creation Error', err.message, 'error');
    }
  };

  const handleOpenDocument = async (id) => {
    try {
      const fileDetail = await api.getFileDetail(id);
      setActiveDoc(fileDetail);
      setCurrentView(id);

      // Connect WebSockets sync room
      const username = currentUser ? currentUser.name : 'You';
      const socket = connectSocket(id, username);

      // Parse payload values
      let contentVal = fileDetail.content;
      if (fileDetail.type === 'sheets') {
        try {
          const cellsData = JSON.parse(fileDetail.content);
          setSimulatedEdits(prev => ({ ...prev, cells: cellsData, sheetDocId: id }));
        } catch (e) {
          setSimulatedEdits(prev => ({ ...prev, cells: {}, sheetDocId: id }));
        }
      } else if (fileDetail.type === 'slides') {
        try {
          const slidesData = JSON.parse(fileDetail.content);
          const slidesArr = slidesData?.slides || (Array.isArray(slidesData) ? slidesData : []);
          setSimulatedEdits(prev => ({ ...prev, slides: slidesArr, slideDocId: id }));
        } catch (e) {
          setSimulatedEdits(prev => ({ ...prev, slides: [], slideDocId: id }));
        }
      } else {
        setSimulatedEdits(prev => ({ ...prev, text: contentVal, textDocId: id }));
      }

      // Register real-time sync hooks
      registerSocketListeners({
        onPeerJoined: ({ username }) => {
          handleAddToast('User Connected', `"${username}" joined this document session.`, 'success');
          otEngine.log(`Peer user "${username}" joined session.`, 'sync');
          setLogs([...otEngine.getLogs()]);
        },
        onCursorUpdate: ({ username, index }) => {
          setSimulatedEdits(prev => ({
            ...prev,
            cursors: { ...prev.cursors, [username]: index }
          }));
        },
        onSelectionUpdate: ({ username, cellId }) => {
          setSimulatedEdits(prev => ({
            ...prev,
            selections: { ...prev.selections, [username]: cellId }
          }));
        },
        onContentUpdate: ({ username, content, revision }) => {
          if (fileDetail.type === 'sheets') {
            try {
              const cellsData = JSON.parse(content);
              setSimulatedEdits(prev => ({ ...prev, cells: cellsData, sheetDocId: id }));
            } catch (e) {}
          } else if (fileDetail.type === 'slides') {
            try {
              const slidesData = JSON.parse(content);
              const slidesArr = slidesData?.slides || (Array.isArray(slidesData) ? slidesData : []);
              setSimulatedEdits(prev => ({ ...prev, slides: slidesArr, slideDocId: id }));
            } catch (e) {}
          } else {
            setSimulatedEdits(prev => ({ ...prev, text: content, textDocId: id }));
          }
          setActiveDoc(prev => ({ ...prev, revision }));
          handleAddToast('Content Synced', `Received edits from ${username}.`, 'info');
          otEngine.log(`Content synced from "${username}" (Revision: ${revision}).`, 'sync');
          setLogs([...otEngine.getLogs()]);
        },
        onElementDragUpdate: ({ username, position }) => {
          setSimulatedEdits(prev => ({
            ...prev,
            positions: { ...prev.positions, [username]: position }
          }));
        }
      });

      handleAddToast('Workspace Synced', `Connected to WebSockets room for "${fileDetail.name}".`, 'success');
    } catch (err) {
      handleAddToast('Open Error', err.message, 'error');
    }
  };

  const handleRenameDoc = async (newName) => {
    if (!activeDoc || !newName.trim()) return;
    try {
      await api.updateFile(activeDoc.id, { name: newName });
      setActiveDoc(prev => ({ ...prev, name: newName }));
      loadWorkspaceData();
    } catch (err) {
      handleAddToast('Rename failed', err.message, 'error');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await api.starFile(id);
      loadWorkspaceData();
    } catch (err) {
      handleAddToast('Favorite Toggle failed', err.message, 'error');
    }
  };

  const handleMoveFile = async (fileId, folderId) => {
    try {
      await api.updateFile(fileId, { folderId });
      loadWorkspaceData();
      handleAddToast('File Organized', 'Document moved to folder successfully.', 'success');
    } catch (err) {
      handleAddToast('Move failed', err.message, 'error');
    }
  };

  // Local save handler (broadcasts edit payloads to sockets)
  const handleLocalSave = async (id, newContent, changeType, extra1, extra2) => {
    let serializedContent = newContent;
    if (activeDoc.type === 'sheets' || activeDoc.type === 'slides') {
      serializedContent = JSON.stringify(newContent);
    }

    try {
      // 1. Write edits to database
      const nextRev = (activeDoc.revision || 10) + 1;
      await api.updateFile(id, { content: serializedContent, revision: nextRev });
      
      // 2. Broadcast updates over Socket.io
      const username = currentUser ? currentUser.name : 'You';
      emitContent(id, username, serializedContent, nextRev);

      // 3. Update local state
      setActiveDoc(prev => ({ ...prev, revision: nextRev }));
      
      // Emit details
      if (activeDoc.type === 'docs' && changeType === 'text-change') {
        emitCursor(id, username, newContent.length);
      } else if (activeDoc.type === 'sheets' && changeType === 'cell-change') {
        emitSelection(id, username, extra1);
      } else if (activeDoc.type === 'slides' && changeType === 'slide-content-change') {
        emitElementDrag(id, username, { x: 100, y: 100 });
      }

      // Add log
      otEngine.log(`Local edit sync: ${changeType}`, 'info');
      setLogs([...otEngine.getLogs()]);

    } catch (err) {
      console.error('Failed to sync content edits: ', err);
    }
  };

  const handleTriggerPresetConflict = (type) => {
    if (!activeDoc) return;
    
    if (type === 'docs-collision') {
      otEngine.log("Docs: Simulating concurrent keystrokes collision...", "info");
      
      const localOp = { 
        type: 'text', 
        action: 'insert', 
        index: 12, 
        text: 'hello', 
        username: 'You', 
        clientId: 'local-client', 
        timestamp: Date.now() 
      };
      const remoteOp = { 
        type: 'text', 
        action: 'insert', 
        index: 12, 
        text: 'world', 
        username: 'Alice', 
        clientId: 'remote-client-1', 
        timestamp: Date.now() + 5 
      };
      
      const { localOp: transformedLocal, remoteOps: transformedRemotes, revision } = otEngine.sync(localOp, [remoteOp]);
      
      handleAddToast('OT Resolved Collision', 'Alice insert at 12 index transformed to 17.', 'warning');
      
      if (activeDoc.type === 'docs') {
        const baseContent = activeDoc.content || '';
        const part1 = baseContent.substring(0, 12);
        const part2 = baseContent.substring(12);
        const newText = part1 + 'hello' + 'world' + part2;
        
        setSimulatedEdits(prev => ({
          ...prev,
          text: newText,
          textDocId: activeDoc.id
        }));
        
        handleLocalSave(activeDoc.id, newText, 'text-change');
      }
    } 
    
    else if (type === 'sheets-collision') {
      otEngine.log("Sheets: Simulating concurrent cell A1 override...", "info");
      
      const localOp = { 
        type: 'cell', 
        cellId: 'A1', 
        value: 'Local Data', 
        username: 'You', 
        timestamp: Date.now() 
      };
      const remoteOp = { 
        type: 'cell', 
        cellId: 'A1', 
        value: 'Alice Overwrite', 
        username: 'Alice', 
        timestamp: Date.now() - 500
      };
      
      const { localOp: transformedLocal, remoteOps: transformedRemotes } = otEngine.sync(localOp, [remoteOp]);
      
      handleAddToast('LWW Resolved Conflict', 'Local update overrides Alice based on timestamp.', 'warning');
      
      if (activeDoc.type === 'sheets') {
        let currentCells = {};
        try {
          currentCells = JSON.parse(activeDoc.content) || {};
        } catch (e) {}
        
        currentCells['A1'] = { value: 'Local Data' };
        
        setSimulatedEdits(prev => ({
          ...prev,
          cells: currentCells,
          sheetDocId: activeDoc.id
        }));
        
        handleLocalSave(activeDoc.id, currentCells, 'cell-change', 'A1');
      }
    } 
    
    else if (type === 'slides-collision') {
      otEngine.log("Slides: Simulating concurrent shape drag on Element-1...", "info");
      
      const localOp = { 
        type: 'slide-element', 
        slideId: 'slide-1', 
        elementId: 'Element-1', 
        x: 150, 
        y: 150, 
        username: 'You' 
      };
      const remoteOp = { 
        type: 'slide-element', 
        slideId: 'slide-1', 
        elementId: 'Element-1', 
        x: 250, 
        y: 250, 
        username: 'Alice' 
      };
      
      const { localOp: transformedLocal, remoteOps: transformedRemotes } = otEngine.sync(localOp, [remoteOp]);
      
      handleAddToast('OT Merged Drags', 'Merged local (150, 150) and remote (250, 250) drags to (200, 200).', 'warning');
      
      if (activeDoc.type === 'slides') {
        let currentSlides = [];
        try {
          const parsed = JSON.parse(activeDoc.content);
          currentSlides = parsed?.slides || (Array.isArray(parsed) ? parsed : []);
        } catch (e) {}
        
        currentSlides = currentSlides.map(slide => {
          if (slide.id === 'slide-1' || slide.id === currentSlides[0]?.id) {
            return {
              ...slide,
              elements: (slide.elements || []).map(el => {
                if (el.id === 'Element-1' || el.id === slide.elements[0]?.id) {
                  return { ...el, x: 200, y: 200 };
                }
                return el;
              })
            };
          }
          return slide;
        });
        
        setSimulatedEdits(prev => ({
          ...prev,
          slides: currentSlides,
          slideDocId: activeDoc.id
        }));
        
        const presentation = {
          id: activeDoc.id,
          title: activeDoc.name,
          slides: currentSlides,
          updatedAt: new Date().toISOString()
        };
        handleLocalSave(activeDoc.id, presentation, 'slide-content-change');
      }
    }
    
    setLogs([...otEngine.getLogs()]);
  };

  const handleMenuUndo = () => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      window.activeTipTapEditor.chain().focus().undo().run();
    } else if (activeDoc?.type === 'sheets' && window.luckysheet) {
      window.luckysheet.undo();
    } else {
      document.execCommand('undo');
    }
  };

  const handleMenuRedo = () => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      window.activeTipTapEditor.chain().focus().redo().run();
    } else if (activeDoc?.type === 'sheets' && window.luckysheet) {
      window.luckysheet.redo();
    } else {
      document.execCommand('redo');
    }
  };

  const handleMenuSelectAll = () => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      window.activeTipTapEditor.chain().focus().selectAll().run();
    } else {
      document.execCommand('selectAll');
    }
  };

  const handleMenuInsertDate = () => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      window.activeTipTapEditor.chain().focus().insertContent(` <strong>${new Date().toLocaleString()}</strong> `).run();
    } else {
      document.execCommand('insertHTML', false, ` <strong>${new Date().toLocaleString()}</strong> `);
    }
  };

  const handleMenuInsertRuler = () => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      window.activeTipTapEditor.chain().focus().setHorizontalRule().run();
    } else {
      document.execCommand('insertHTML', false, '<hr style="border: 0; border-top: 1px solid var(--n-border); margin: 16px 0;" />');
    }
  };

  const handleMenuInsertTable = () => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      window.activeTipTapEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    } else {
      document.execCommand('insertHTML', false, '<table style="border-collapse: collapse; width: 100%; border: 1px solid var(--n-border);"><tr><td style="border: 1px solid var(--n-border); padding: 8px; height: 24px;"></td><td style="border: 1px solid var(--n-border); padding: 8px;"></td><td style="border: 1px solid var(--n-border); padding: 8px;"></td></tr><tr><td style="border: 1px solid var(--n-border); padding: 8px; height: 24px;"></td><td style="border: 1px solid var(--n-border); padding: 8px;"></td><td style="border: 1px solid var(--n-border); padding: 8px;"></td></tr></table>');
    }
  };

  const handleMenuFormat = (formatType) => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      const ed = window.activeTipTapEditor.chain().focus();
      if (formatType === 'bold') ed.toggleBold().run();
      else if (formatType === 'italic') ed.toggleItalic().run();
      else if (formatType === 'underline') ed.toggleUnderline().run();
      else if (formatType === 'strike') ed.toggleStrike().run();
      else if (formatType === 'clear') ed.unsetAllMarks().clearNodes().run();
    } else if (activeDoc?.type === 'sheets' && window.luckysheet) {
      if (formatType === 'bold') window.luckysheet.setFontBold();
      else if (formatType === 'italic') window.luckysheet.setFontItalic();
    } else {
      const cmd = formatType === 'bold' ? 'bold' : formatType === 'italic' ? 'italic' : formatType === 'underline' ? 'underline' : formatType === 'strike' ? 'strikeThrough' : 'removeFormat';
      document.execCommand(cmd);
    }
  };

  const handleMenuCapitalize = (casing) => {
    if (activeDoc?.type === 'docs' && window.activeTipTapEditor) {
      const { from, to } = window.activeTipTapEditor.state.selection;
      if (from !== to) {
        const text = window.activeTipTapEditor.state.doc.textBetween(from, to);
        window.activeTipTapEditor.chain().focus().insertContentAt({ from, to }, casing === 'upper' ? text.toUpperCase() : text.toLowerCase()).run();
      }
    } else {
      const sel = window.getSelection().toString();
      if (sel) {
        document.execCommand('insertHTML', false, casing === 'upper' ? sel.toUpperCase() : sel.toLowerCase());
      }
    }
  };

  const handleDownloadFile = (formatType) => {
    if (!activeDoc) return;
    
    let content = '';
    let filename = activeDoc.name || 'document';
    let mimeType = 'text/plain';
    
    if (activeDoc.type === 'docs') {
      if (window.activeTipTapEditor) {
        if (formatType === 'html') {
          content = window.activeTipTapEditor.getHTML();
          filename += '.html';
          mimeType = 'text/html';
        } else {
          content = window.activeTipTapEditor.getText();
          filename += '.txt';
        }
      } else {
        const editorDiv = document.querySelector('.docs-paper-sheet [contenteditable]');
        if (formatType === 'html') {
          content = editorDiv?.innerHTML || activeDoc.content || '';
          filename += '.html';
          mimeType = 'text/html';
        } else {
          content = editorDiv?.innerText || activeDoc.content || '';
          filename += '.txt';
        }
      }
    } else if (activeDoc.type === 'sheets') {
      content = typeof activeDoc.content === 'string' ? activeDoc.content : JSON.stringify(activeDoc.content, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else {
      content = typeof activeDoc.content === 'string' ? activeDoc.content : JSON.stringify(activeDoc.content, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    handleAddToast('Export Complete', `File downloaded as ${formatType === 'html' ? 'HTML' : 'Text/JSON'}.`, 'success');
  };

  const handleWordCount = () => {
    if (!activeDoc) return;
    let textContent = '';
    if (activeDoc.type === 'docs') {
      if (window.activeTipTapEditor) {
        textContent = window.activeTipTapEditor.getText();
      } else {
        textContent = document.querySelector('.docs-paper-sheet [contenteditable]')?.innerText || activeDoc.content || '';
      }
    } else if (activeDoc.type === 'sheets') {
      try {
        const cells = JSON.parse(activeDoc.content) || {};
        textContent = Object.values(cells).map(c => c?.rawValue || '').join(' ');
      } catch(e) {}
    }
    const words = textContent.trim().split(/\s+/).filter(Boolean).length;
    const chars = textContent.length;
    handleAddToast('Word Count', `Words: ${words} | Characters: ${chars}`, 'success');
  };

  const handleClearContent = () => {
    if (!activeDoc) return;
    if (activeDoc.type === 'docs') {
      if (window.activeTipTapEditor) {
        window.activeTipTapEditor.commands.clearContent(true);
        handleLocalSave(activeDoc.id, '<p><br></p>', 'text-change');
        handleAddToast('Content Cleared', 'Document content has been cleared.', 'info');
      } else {
        const editorDiv = document.querySelector('.docs-paper-sheet [contenteditable]');
        if (editorDiv) {
          editorDiv.innerHTML = '<p><br></p>';
          handleLocalSave(activeDoc.id, '<p><br></p>', 'text-change');
          handleAddToast('Content Cleared', 'Document content has been cleared.', 'info');
        }
      }
    } else if (activeDoc.type === 'sheets') {
      if (window.luckysheet) {
        // Clear all cell contents in the Luckysheet instance natively
        const activeSheet = window.luckysheet.getluckysheetfile()[0];
        if (activeSheet && activeSheet.data) {
          for (let r = 0; r < activeSheet.data.length; r++) {
            for (let c = 0; c < activeSheet.data[r].length; c++) {
              window.luckysheet.setCellValue(r, c, null);
            }
          }
          window.luckysheet.refresh();
        }
      }
      handleLocalSave(activeDoc.id, {}, 'cell-change', 'A1');
      setSimulatedEdits(prev => ({ ...prev, cells: {}, sheetDocId: activeDoc.id }));
      handleAddToast('Content Cleared', 'Spreadsheet cleared.', 'info');
    }
  };

  const handleOpenDashboard = () => {
    disconnectSocket();
    setCurrentView('dashboard');
    setActiveDoc(null);
    loadWorkspaceData();
  };

  const handleBackToDashboard = async () => {
    setIsSavingAndLeaving(true);
    try {
      if (window.triggerImmediateSave) {
        await window.triggerImmediateSave();
      }
    } catch (e) {
      console.error("Autosave before navigation failed:", e);
    }
    handleOpenDashboard();
    setIsSavingAndLeaving(false);
  };

  const handleCommandPaletteAction = (cmdId) => {
    if (cmdId === 'go-home') handleOpenDashboard();
    else if (cmdId === 'new-doc') handleCreateDocument('docs');
    else if (cmdId === 'new-sheet') handleCreateDocument('sheets');
    else if (cmdId === 'new-slide') handleCreateDocument('slides');
    else if (cmdId === 'open-settings') setIsSettingsOpen(true);
    else if (cmdId === 'open-share') {
      if (activeDoc) setIsShareOpen(true);
      else handleAddToast('Sharing Restricted', 'Please open a document workspace to configure permissions.', 'error');
    } else if (cmdId === 'logout') handleLogout();
  };

  // If user is not authenticated, show Register or Login
  if (!authToken) {
    return authView === 'login' ? (
      <Login 
        onAuthSuccess={handleAuthSuccess} 
        onToggleRegister={() => setAuthView('register')} 
        onAddToast={handleAddToast} 
      />
    ) : (
      <Register 
        onAuthSuccess={handleAuthSuccess} 
        onToggleLogin={() => setAuthView('login')} 
        onAddToast={handleAddToast} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Editor top header navigation */}
      {currentView !== 'dashboard' && activeDoc && (
        <header className="editor-header-bar animate-fade">
          <div className="editor-title-group">
            <button 
              onClick={handleBackToDashboard} 
              className="n-back-dashboard-btn" 
              title="Save work and return to Dashboard"
              disabled={isSavingAndLeaving}
              style={{
                marginRight: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--n-border)',
                background: 'var(--n-bg-workspace)',
                color: 'var(--n-text-main)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isSavingAndLeaving ? 0.7 : 1,
                pointerEvents: isSavingAndLeaving ? 'none' : 'auto'
              }}
            >
              {isSavingAndLeaving ? (
                <span className="animate-spin" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
              ) : (
                <ArrowLeft size={14} />
              )}
              <span>{isSavingAndLeaving ? 'Saving...' : '← Dashboard'}</span>
            </button>

            <div 
              onClick={handleBackToDashboard}
              className="g-logo-wrapper"
              title="Return to Dashboard"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div className={`editor-title-icon ${activeDoc.type}`}>
                {activeDoc.type === 'docs' && <FileText size={18} />}
                {activeDoc.type === 'sheets' && <Grid size={18} />}
                {activeDoc.type === 'slides' && <Presentation size={18} />}
              </div>
            </div>

            <div className="editor-doc-input-wrapper">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={activeDoc.name}
                  onChange={(e) => handleRenameDoc(e.target.value)}
                  className="editor-doc-name-input"
                  style={{ width: '260px' }}
                />
                <div style={{ color: 'var(--n-primary)', display: 'flex', alignItems: 'center' }}>
                  <CheckCircle size={14} title="Synced to Database" />
                </div>
              </div>
              
              <div className="editor-menubar" style={{ position: 'relative', display: 'flex', gap: '8px', zIndex: 99 }}>
                {/* File */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className={`editor-menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
                    onClick={(e) => handleToggleMenu(e, 'file')}
                  >
                    File
                  </button>
                  {activeMenu === 'file' && (
                    <div style={dropdownStyle}>
                      <DropdownItem label="New Document" onClick={() => handleCreateDocument('docs')} />
                      <DropdownItem label="New Spreadsheet" onClick={() => handleCreateDocument('sheets')} />
                      <DropdownItem label="New Presentation" onClick={() => handleCreateDocument('slides')} />
                      <div style={dividerStyle} />
                      <DropdownItem label="Download File" onClick={() => handleDownloadFile('txt')} />
                      {activeDoc.type === 'docs' && <DropdownItem label="Download HTML" onClick={() => handleDownloadFile('html')} />}
                      <div style={dividerStyle} />
                      <DropdownItem label="Print File" shortcut="Ctrl+P" onClick={() => window.print()} />
                      <div style={dividerStyle} />
                      <DropdownItem label="Close File" onClick={handleBackToDashboard} danger />
                    </div>
                  )}
                </div>

                {/* Edit */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className={`editor-menu-btn ${activeMenu === 'edit' ? 'active' : ''}`}
                    onClick={(e) => handleToggleMenu(e, 'edit')}
                  >
                    Edit
                  </button>
                  {activeMenu === 'edit' && (
                    <div style={dropdownStyle}>
                      <DropdownItem label="Undo" shortcut="Ctrl+Z" onClick={handleMenuUndo} />
                      <DropdownItem label="Redo" shortcut="Ctrl+Y" onClick={handleMenuRedo} />
                      <div style={dividerStyle} />
                      <DropdownItem label="Select All" shortcut="Ctrl+A" onClick={handleMenuSelectAll} />
                      <DropdownItem label="Clear Content" onClick={handleClearContent} danger />
                    </div>
                  )}
                </div>

                {/* View */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className={`editor-menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
                    onClick={(e) => handleToggleMenu(e, 'view')}
                  >
                    View
                  </button>
                  {activeMenu === 'view' && (
                    <div style={dropdownStyle}>
                      <DropdownItem 
                        label={isSimPanelOpen ? "Hide Simulation Dock" : "Show Simulation Dock"} 
                        onClick={() => setIsSimPanelOpen(!isSimPanelOpen)} 
                      />
                      <DropdownItem label="Open Settings" onClick={() => setIsSettingsOpen(true)} />
                      <DropdownItem label="Command Palette" shortcut="Ctrl+K" onClick={() => setIsCommandPaletteOpen(true)} />
                    </div>
                  )}
                </div>

                {/* Insert */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className={`editor-menu-btn ${activeMenu === 'insert' ? 'active' : ''}`}
                    onClick={(e) => handleToggleMenu(e, 'insert')}
                  >
                    Insert
                  </button>
                  {activeMenu === 'insert' && (
                    <div style={dropdownStyle}>
                      <DropdownItem 
                        label="Current Date & Time" 
                        onClick={handleMenuInsertDate} 
                      />
                      <DropdownItem 
                        label="Horizontal Ruler" 
                        onClick={handleMenuInsertRuler} 
                      />
                      <DropdownItem 
                        label="Table (3x3 Grid)" 
                        onClick={handleMenuInsertTable} 
                      />
                    </div>
                  )}
                </div>

                {/* Format */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className={`editor-menu-btn ${activeMenu === 'format' ? 'active' : ''}`}
                    onClick={(e) => handleToggleMenu(e, 'format')}
                  >
                    Format
                  </button>
                  {activeMenu === 'format' && (
                    <div style={dropdownStyle}>
                      <DropdownItem label="Bold" shortcut="Ctrl+B" onClick={() => handleMenuFormat('bold')} />
                      <DropdownItem label="Italic" shortcut="Ctrl+I" onClick={() => handleMenuFormat('italic')} />
                      <DropdownItem label="Underline" shortcut="Ctrl+U" onClick={() => handleMenuFormat('underline')} />
                      <DropdownItem label="Strikethrough" onClick={() => handleMenuFormat('strike')} />
                      <div style={dividerStyle} />
                      <DropdownItem label="Clear Formatting" onClick={() => handleMenuFormat('clear')} />
                    </div>
                  )}
                </div>

                {/* Tools */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className={`editor-menu-btn ${activeMenu === 'tools' ? 'active' : ''}`}
                    onClick={(e) => handleToggleMenu(e, 'tools')}
                  >
                    Tools
                  </button>
                  {activeMenu === 'tools' && (
                    <div style={dropdownStyle}>
                      <DropdownItem label="Word Count" onClick={handleWordCount} />
                      <DropdownItem 
                        label="Capitalize Selection" 
                        onClick={() => handleMenuCapitalize('upper')} 
                      />
                      <DropdownItem 
                        label="Lowercase Selection" 
                        onClick={() => handleMenuCapitalize('lower')} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="editor-right-group">
            {/* Real user avatars indicators */}
            <div className="g-avatars-group" style={{ display: 'flex' }}>
              <div className="n-avatar" style={{ zIndex: 10, background: 'var(--n-primary)', border: '2px solid white' }} title="You (Owner)">
                {currentUser?.name?.substring(0,2).toUpperCase() || 'U'}
              </div>
              {activeBots.Alice && <div className="n-avatar" style={{ zIndex: 9, background: 'var(--n-docs)', border: '2px solid white', marginLeft: '-6px' }} title="Alice (Editor)">AL</div>}
              {activeBots.Charlie && <div className="n-avatar" style={{ zIndex: 8, background: 'var(--n-slides)', border: '2px solid white', marginLeft: '-6px' }} title="Charlie (Viewer)">CH</div>}
            </div>

            <button 
              className="editor-share-btn"
              onClick={() => setIsShareOpen(true)}
              title="Add email permissions"
            >
              <Share2 size={13} />
              Share
            </button>

            <button 
              className="n-icon-btn"
              onClick={handleOpenDashboard}
              title="Logout session and return to Dashboard"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
      )}

      {/* Main split */}
      <div className="g-split-workspace" style={{ height: currentView === 'dashboard' ? '100vh' : 'calc(100vh - 64px)' }}>
        
        {/* Editor or Dashboard Section */}
        <div className="g-editor-canvas-column">
          {currentView === 'dashboard' ? (
            <Dashboard 
              documents={documents} 
              onCreateDoc={handleCreateDocument} 
              onOpenDoc={handleOpenDocument}
              onToggleFavorite={handleToggleFavorite}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenShare={() => setIsShareOpen(true)}
              onAddToast={handleAddToast}
              foldersList={folders}
              onLogout={handleLogout}
              onMoveFile={handleMoveFile}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {activeDoc.type === 'docs' && (
                <DocsEditor 
                  doc={activeDoc} 
                  onSave={handleLocalSave} 
                  simulatedEdits={simulatedEdits}
                  otEngine={otEngine}
                  onAddToast={handleAddToast}
                />
              )}
              {activeDoc.type === 'sheets' && (
                <SheetsEditor 
                  doc={activeDoc} 
                  onSave={handleLocalSave} 
                  simulatedEdits={simulatedEdits}
                  otEngine={otEngine}
                  onAddToast={handleAddToast}
                />
              )}
              {activeDoc.type === 'slides' && (
                <SlidesEditor 
                  doc={activeDoc} 
                  onSave={handleLocalSave} 
                  simulatedEdits={simulatedEdits}
                  otEngine={otEngine}
                  onAddToast={handleAddToast}
                />
              )}
            </div>
          )}
        </div>

        {/* Collapsible right sidebar (OT simulation logger) */}
        {activeDoc && currentView !== 'dashboard' && (
          <div style={{ display: 'flex', flexShrink: 0, height: '100%' }}>
            <div className="g-side-dock" style={{ borderLeft: '1px solid var(--n-border)' }}>
              <button 
                onClick={() => setIsSimPanelOpen(!isSimPanelOpen)}
                className={`g-side-dock-btn ${isSimPanelOpen ? 'active' : ''}`}
                style={{
                  background: isSimPanelOpen ? 'var(--n-primary-light)' : 'transparent',
                  color: isSimPanelOpen ? 'var(--n-primary)' : 'var(--n-text-sub)'
                }}
                title="Toggle Collaboration Simulation Panel"
              >
                <Activity size={18} />
              </button>
            </div>

            {isSimPanelOpen && (
              <div className="g-side-panel">
                <CollabSimPanel 
                  engine={otEngine} 
                  logs={logs} 
                  onClearLogs={() => setLogs([])} 
                  activeBots={activeBots}
                  onChangeBots={(isPeriodicRun, botName) => {
                    if (botName) {
                      setActiveBots(prev => ({ ...prev, [botName]: !prev[botName] }));
                    }
                  }}
                  onTriggerPreset={handleTriggerPresetConflict}
                  currentDocType={activeDoc.type}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog Overlays */}
      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        docName={activeDoc?.name} 
        otEngine={otEngine}
        onAddToast={handleAddToast}
      />

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onAddToast={handleAddToast}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
      />

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onAction={handleCommandPaletteAction}
      />

      {/* Toast Alert Popups */}
      <Toast toasts={toasts} onRemoveToast={handleRemoveToast} />

    </div>
  );
}
