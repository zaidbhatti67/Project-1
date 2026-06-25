import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getSocket, emitCursor } from '../services/socket';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';

import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  MessageSquare, 
  Printer, 
  CornerUpLeft, 
  CornerUpRight,
  Plus,
  Sparkles,
  ChevronDown,
  Sparkle,
  History,
  List,
  ListOrdered,
  Outdent,
  Indent,
  Eraser,
  Link as LinkIcon,
  Image as ImageIcon,
  Paintbrush,
  Highlighter,
  Baseline,
  Table as TableIcon,
  PlusSquare,
  MinusSquare,
  FileSpreadsheet,
  Copy,
  Scissors,
  Clipboard,
  ListTodo,
  Strikethrough
} from 'lucide-react';

const GOOGLE_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#efefef', '#f3f3f3', '#ffffff',
  '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9ee1', '#6fa8dc', '#8e7cc3',
  '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7',
  '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75',
  '#741b47', '#4c1130', '#f3f3f3', '#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252'
];

// Custom Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .run();
      },
    };
  },
});

// Custom Line Spacing Extension
const LineSpacing = Extension.create({
  name: 'lineSpacing',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem', 'taskItem'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineSpacing: {
            default: null,
            parseHTML: element => element.style.lineHeight || element.getAttribute('data-line-spacing'),
            renderHTML: attributes => {
              if (!attributes.lineSpacing) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineSpacing}`,
                'data-line-spacing': attributes.lineSpacing,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineSpacing: lineSpacing => ({ commands }) => {
        return this.options.types.every(type => commands.updateAttributes(type, { lineSpacing }));
      },
      unsetLineSpacing: () => ({ commands }) => {
        return this.options.types.every(type => commands.updateAttributes(type, { lineSpacing: null }));
      },
    };
  },
});

// Custom Indent Extension
const IndentExtension = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem', 'taskItem'],
      indentRange: 24, // 24px per indent level
      maxIndentLevel: 10,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: null,
            parseHTML: element => {
              const style = element.style.paddingLeft;
              return style ? parseInt(style, 10) : null;
            },
            renderHTML: attributes => {
              if (!attributes.indent) {
                return {};
              }
              return {
                style: `padding-left: ${attributes.indent}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch, commands }) => {
        const { selection } = state;
        let changed = false;
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const currentIndent = node.attrs.indent || 0;
            if (currentIndent < this.options.maxIndentLevel * this.options.indentRange) {
              const nextIndent = currentIndent + this.options.indentRange;
              commands.updateAttributes(node.type.name, { indent: nextIndent });
              changed = true;
            }
          }
        });
        return changed;
      },
      outdent: () => ({ tr, state, dispatch, commands }) => {
        const { selection } = state;
        let changed = false;
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const currentIndent = node.attrs.indent || 0;
            if (currentIndent > 0) {
              const nextIndent = currentIndent - this.options.indentRange;
              commands.updateAttributes(node.type.name, { indent: nextIndent > 0 ? nextIndent : null });
              changed = true;
            }
          }
        });
        return changed;
      },
    };
  },
});

// Custom Resizable Image Extension
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: element => element.getAttribute('width') || element.style.width,
        renderHTML: attributes => ({
          width: attributes.width,
          style: `width: ${attributes.width}; max-width: 100%; cursor: pointer; transition: all 0.2s;`
        })
      }
    };
  }
});

export default function DocsEditor({ doc, onSave, simulatedEdits, otEngine, onAddToast }) {
  const [text, setText] = useState(doc.content || '');
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  
  // Gemini AI Draft Box state
  const [geminiInput, setGeminiInput] = useState('');
  const [isGeminiWriting, setIsGeminiWriting] = useState(false);

  // Active formats and layout styles
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [align, setAlign] = useState('left');
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [lineSpacing, setLineSpacing] = useState('1.15');
  const [zoom, setZoom] = useState(() => parseInt(localStorage.getItem('nexus_zoom'), 10) || 100);

  // Overlay states
  const [isTextColorOpen, setIsTextColorOpen] = useState(false);
  const [isHighlightColorOpen, setIsHighlightColorOpen] = useState(false);
  const [isTextStyleOpen, setIsTextStyleOpen] = useState(false);
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [textStyle, setTextStyle] = useState('Normal text');

  // Sidebar Tabs
  const [sidebarTab, setSidebarTab] = useState('comments');

  const userStr = localStorage.getItem('nexus_user');
  const currentUser = userStr ? JSON.parse(userStr) : { name: 'You' };
  const username = currentUser.name || 'You';

  // Close overlays click listener
  useEffect(() => {
    const handleCloseOverlays = () => {
      setIsTextColorOpen(false);
      setIsHighlightColorOpen(false);
      setIsTextStyleOpen(false);
      setIsTableMenuOpen(false);
    };
    window.addEventListener('click', handleCloseOverlays);
    return () => window.removeEventListener('click', handleCloseOverlays);
  }, []);

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      CustomImage.configure({
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'table', 'tableCell'],
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      LineSpacing,
      IndentExtension,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: doc.content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setText(html);
      checkActiveFormats(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      checkActiveFormats(editor);
      emitCaretPosition(editor);
    },
    editorProps: {
      attributes: {
        spellcheck: 'true',
        class: 'focus:outline-none min-h-[800px] w-full',
      }
    }
  });

  // Debounced save to database & broadcast to sockets
  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      const html = editor.getHTML();
      if (html !== doc.content) {
        const isAutoSaveEnabled = localStorage.getItem('nexus_autosave') !== 'false';
        if (isAutoSaveEnabled) {
          onSave(doc.id, html, 'text-change');
        }
      }
    }, 1200); // 1.2s debounce
    return () => clearTimeout(timer);
  }, [text, doc.id, onSave, editor]);

  // Expose active editor instance and immediate save globally
  useEffect(() => {
    if (editor) {
      window.activeTipTapEditor = editor;
      window.triggerImmediateSave = async () => {
        const html = editor.getHTML();
        await onSave(doc.id, html, 'text-change');
      };
      return () => {
        if (window.activeTipTapEditor === editor) {
          window.activeTipTapEditor = null;
        }
        if (window.triggerImmediateSave) {
          window.triggerImmediateSave = null;
        }
      };
    }
  }, [editor, doc.id, onSave]);

  // Load database comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        const list = await api.getComments(doc.id);
        setComments(list.filter(c => !c.resolved));
      } catch (err) {
        setComments(doc.comments || []);
      }
    };
    loadComments();
  }, [doc.id]);

  // Sync edits if WebSocket updates content
  useEffect(() => {
    if (editor && simulatedEdits && simulatedEdits.textDocId === doc.id) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== simulatedEdits.text) {
        editor.commands.setContent(simulatedEdits.text, false);
        setText(simulatedEdits.text);
      }
    }
  }, [simulatedEdits, doc.id, editor]);

  // Reset editor content when file changes
  useEffect(() => {
    if (editor && doc.id) {
      editor.commands.setContent(doc.content || '');
      setText(doc.content || '');
    }
  }, [doc.id, editor]);

  // Listen for peer comments
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handlePeerComment = ({ comment }) => {
      setComments(prev => {
        if (prev.find(c => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };
    socket.on('comment-added', handlePeerComment);
    return () => {
      socket.off('comment-added', handlePeerComment);
    };
  }, []);

  const emitCaretPosition = (editorInst) => {
    const selection = editorInst.state.selection;
    emitCursor(doc.id, username, selection.anchor);
  };

  const checkActiveFormats = (editorInst) => {
    if (!editorInst) return;
    setIsBold(editorInst.isActive('bold'));
    setIsItalic(editorInst.isActive('italic'));
    setIsUnderline(editorInst.isActive('underline'));
    
    if (editorInst.isActive({ textAlign: 'center' })) setAlign('center');
    else if (editorInst.isActive({ textAlign: 'right' })) setAlign('right');
    else if (editorInst.isActive({ textAlign: 'justify' })) setAlign('justify');
    else setAlign('left');

    const styleName = editorInst.isActive('heading', { level: 1 }) ? 'Heading 1' :
                     editorInst.isActive('heading', { level: 2 }) ? 'Heading 2' :
                     editorInst.isActive('heading', { level: 3 }) ? 'Heading 3' : 'Normal text';
    setTextStyle(styleName);

    // Read fontFamily & fontSize from selected TextStyle mark
    const fontAttr = editorInst.getAttributes('textStyle').fontFamily;
    if (fontAttr) setFontFamily(fontAttr);
    const sizeAttr = editorInst.getAttributes('textStyle').fontSize;
    if (sizeAttr) {
      const numericSize = parseInt(sizeAttr, 10);
      if (!isNaN(numericSize)) setFontSize(numericSize);
    }

    // Read line spacing
    const lineSpacingAttr = editorInst.getAttributes('paragraph').lineSpacing || 
                            editorInst.getAttributes('heading').lineSpacing;
    if (lineSpacingAttr) {
      setLineSpacing(lineSpacingAttr);
    } else {
      setLineSpacing('1.15');
    }
  };

  const handleSelectTextColor = (color) => {
    if (editor) editor.chain().focus().setColor(color).run();
    setIsTextColorOpen(false);
  };

  const handleSelectHighlightColor = (color) => {
    if (editor) editor.chain().focus().toggleHighlight({ color }).run();
    setIsHighlightColorOpen(false);
  };

  const handleSelectTextStyle = (tag, name) => {
    if (!editor) return;
    if (tag === 'p') {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(tag.substring(1), 10);
      editor.chain().focus().toggleHeading({ level }).run();
    }
    setTextStyle(name);
    setIsTextStyleOpen(false);
  };

  const handleInsertLink = () => {
    if (!editor) return;
    const url = prompt('Enter link URL (e.g. https://google.com):');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
      otEngine.log(`Inserted link: ${url}`, 'info');
    }
  };

  const handleInsertImage = () => {
    if (!editor) return;
    const url = prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
      otEngine.log(`Inserted image: ${url}`, 'info');
    }
  };

  const handleCopyText = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      if (onAddToast) onAddToast('Copy', 'No text selected to copy.', 'warning');
      return;
    }
    const textVal = editor.state.doc.textBetween(from, to);
    navigator.clipboard.writeText(textVal).then(() => {
      if (onAddToast) onAddToast('Copy', 'Selection copied.', 'success');
    }).catch(() => {
      if (onAddToast) onAddToast('Copy', 'Copy failed.', 'error');
    });
  };

  const handleCutText = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      if (onAddToast) onAddToast('Cut', 'No text selected to cut.', 'warning');
      return;
    }
    const textVal = editor.state.doc.textBetween(from, to);
    navigator.clipboard.writeText(textVal).then(() => {
      editor.chain().focus().deleteSelection().run();
      if (onAddToast) onAddToast('Cut', 'Selection cut.', 'success');
    }).catch(() => {
      if (onAddToast) onAddToast('Cut', 'Cut failed.', 'error');
    });
  };

  const handlePasteText = () => {
    if (!editor) return;
    navigator.clipboard.readText().then(clipText => {
      if (clipText) {
        editor.chain().focus().insertContent(clipText).run();
        if (onAddToast) onAddToast('Paste', 'Content pasted.', 'success');
      }
    }).catch(() => {
      if (onAddToast) onAddToast('Paste Tip', 'Use Ctrl+V keyboard shortcut to paste.', 'info');
    });
  };

  // Image Resizer trigger
  const handleImageClick = (e) => {
    if (e.target.tagName === 'IMG' && editor) {
      const currentWidth = e.target.style.width || e.target.getAttribute('width') || '100%';
      const nextWidth = prompt('Adjust Image Width (e.g. 50%, 400px, 100%):', currentWidth);
      if (nextWidth !== null) {
        editor.chain().focus().updateAttributes('image', { width: nextWidth }).run();
        onSave(doc.id, editor.getHTML(), 'text-change');
      }
    }
  };

  const handleGeminiDraft = (e) => {
    e.preventDefault();
    if (!geminiInput.trim() || !editor) return;
    
    setIsGeminiWriting(true);
    otEngine.log(`AI (Gemini) drafting content: "${geminiInput}"`, 'sync');
    if (onAddToast) {
      onAddToast('Gemini Drafting', 'AI writer is synthesizing outline...', 'info');
    }
    
    setTimeout(() => {
      const generatedHTML = `<br/><h2>Project Goal: ${geminiInput}</h2><p>This project workspace implements Operational Transformations to sync editor states. The design is structured with logic and specifications to guarantee eventual consistency across Docs, Sheets, and Slides.</p><br/>`;
      editor.chain().focus().insertContent(generatedHTML).run();
      setIsGeminiWriting(false);
      setGeminiInput('');
      
      onSave(doc.id, editor.getHTML(), 'text-change');
      otEngine.log("Gemini draft injected into document successfully.", "info");
      if (onAddToast) {
        onAddToast('Gemini Complete', 'AI draft injected successfully.', 'success');
      }
    }, 1200);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !editor) return;
    
    try {
      const newComment = await api.postComment(doc.id, commentInput.trim());
      setComments([...comments, newComment]);
      setCommentInput('');
      
      const socket = getSocket();
      if (socket) {
        socket.emit('comment-post', { fileId: doc.id, comment: newComment });
      }

      // Wrap selected text in highlight style to link to comment
      editor.chain().focus().toggleHighlight({ color: '#ffe599' }).run();

      if (onAddToast) {
        onAddToast('Comment Posted', 'Comment saved & text selection highlighted.', 'success');
      }
      otEngine.log(`Local user added comment: "${commentInput}"`, 'info');
    } catch (err) {
      if (onAddToast) onAddToast('Failed to post comment', err.message, 'error');
    }
  };

  const handleResolveComment = async (id, author) => {
    try {
      await api.resolveComment(id);
      setComments(comments.filter(c => c.id !== id));
      otEngine.log(`Resolved comment thread created by ${author}.`, 'info');
      if (onAddToast) {
        onAddToast('Comment Resolved', 'Comment thread marked as resolved in DB.', 'success');
      }
    } catch (err) {
      if (onAddToast) onAddToast('Failed to resolve comment', err.message, 'error');
    }
  };

  const getOutline = () => {
    const parser = new DOMParser();
    const docObj = parser.parseFromString(text, 'text/html');
    const headings = docObj.querySelectorAll('h1, h2, h3');
    const outlineItems = [];
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1), 10);
      outlineItems.push({ text: heading.textContent || '', level, lineIndex: index });
    });
    return outlineItems;
  };

  const outline = getOutline();

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <style>{`
        .docs-paper-sheet {
          background: #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04);
          border: 1px solid var(--n-border);
          min-height: 1056px;
          width: 816px;
          margin: 24px auto;
          padding: 80px 96px;
          box-sizing: border-box;
          text-align: left;
          position: relative;
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 12px 0;
          overflow: hidden;
        }
        .ProseMirror table td, .ProseMirror table th {
          min-width: 1em;
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror table th {
          font-weight: 600;
          background-color: #f8fafc;
        }
        .ProseMirror table .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(14, 165, 233, 0.15);
          pointer-events: none;
        }
        .ProseMirror table .column-resize-handle {
          position: absolute;
          right: -2px; top: 0; bottom: 0;
          width: 4px;
          background-color: var(--n-primary);
          cursor: col-resize;
        }
        .docs-color-dropdown {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          border: 1px solid var(--n-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 8px;
          z-index: 1000;
          display: grid;
          grid-template-columns: repeat(8, 16px);
          gap: 6px;
          margin-top: 4px;
        }
        .docs-color-swatch {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.1);
          transition: transform 0.1s ease;
        }
        .docs-color-swatch:hover {
          transform: scale(1.25);
        }
        .docs-style-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          background: #ffffff;
          border: 1px solid var(--n-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 4px 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          min-width: 135px;
          margin-top: 4px;
        }
        .docs-style-item {
          padding: 8px 12px;
          font-size: 11px;
          text-align: left;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--n-text-sub);
          display: flex;
          flex-direction: column;
        }
        .docs-style-item:hover {
          background: var(--n-primary-light);
          color: var(--n-primary);
          font-weight: 500;
        }
      `}</style>
      
      {/* Formatting Toolbar */}
      <div className="n-toolbar-container" style={{ flexWrap: 'wrap', height: 'auto', padding: '6px 12px', gap: '4px' }}>
        <button className="n-toolbar-item" title="Undo" onClick={() => editor?.chain().focus().undo().run()}><CornerUpLeft size={14} /></button>
        <button className="n-toolbar-item" title="Redo" onClick={() => editor?.chain().focus().redo().run()}><CornerUpRight size={14} /></button>
        <button className="n-toolbar-item" title="Print" onClick={() => window.print()}><Printer size={14} /></button>
        <button className="n-toolbar-item" title="Paint Format" onClick={() => { onAddToast('Paint Format', 'Copied character styling to cursor.', 'info'); }}><Paintbrush size={14} /></button>
        
        <div className="n-toolbar-divider" />

        {/* Copy, Cut, Paste, Select All */}
        <button className="n-toolbar-item" title="Copy" onClick={handleCopyText}><Copy size={14} /></button>
        <button className="n-toolbar-item" title="Cut" onClick={handleCutText}><Scissors size={14} /></button>
        <button className="n-toolbar-item" title="Paste" onClick={handlePasteText}><Clipboard size={14} /></button>
        <button className="n-toolbar-item" title="Select All" onClick={() => editor?.chain().focus().selectAll().run()}>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>All</span>
        </button>

        <div className="n-toolbar-divider" />
        
        {/* Zoom */}
        <select 
          value={zoom} 
          onChange={(e) => setZoom(parseInt(e.target.value))}
          className="n-toolbar-select"
          style={{ width: '65px' }}
        >
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="100">100%</option>
          <option value="125">125%</option>
          <option value="150">150%</option>
        </select>
        
        <div className="n-toolbar-divider" />

        {/* Text Style Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`n-toolbar-item ${isTextStyleOpen ? 'active' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setIsTextStyleOpen(!isTextStyleOpen); }}
            style={{ width: '105px', justifyContent: 'space-between', display: 'flex', gap: '4px' }}
          >
            <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{textStyle}</span>
            <ChevronDown size={12} />
          </button>
          {isTextStyleOpen && (
            <div className="docs-style-dropdown">
              <button className="docs-style-item" onMouseDown={e => e.preventDefault()} onClick={() => handleSelectTextStyle('p', 'Normal text')}>
                <span>Normal text</span>
                <span style={{ fontSize: '9px', opacity: 0.5 }}>Arial 11pt</span>
              </button>
              <button className="docs-style-item" onMouseDown={e => e.preventDefault()} onClick={() => handleSelectTextStyle('h1', 'Heading 1')}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Heading 1</span>
              </button>
              <button className="docs-style-item" onMouseDown={e => e.preventDefault()} onClick={() => handleSelectTextStyle('h2', 'Heading 2')}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Heading 2</span>
              </button>
              <button className="docs-style-item" onMouseDown={e => e.preventDefault()} onClick={() => handleSelectTextStyle('h3', 'Heading 3')}>
                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Heading 3</span>
              </button>
            </div>
          )}
        </div>

        <div className="n-toolbar-divider" />
        
        {/* Font Family Dropdown */}
        <select 
          value={fontFamily} 
          onChange={(e) => {
            const font = e.target.value;
            setFontFamily(font);
            editor?.chain().focus().setFontFamily(font).run();
          }}
          className="n-toolbar-select"
          style={{ width: '135px' }}
          title="Font Family"
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Calibri">Calibri</option>
          <option value="Cambria">Cambria</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
          <option value="Courier New">Courier New</option>
          <option value="Roboto">Roboto</option>
          <option value="Open Sans">Open Sans</option>
          <option value="Lato">Lato</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Poppins">Poppins</option>
          <option value="Inter">Inter</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
        </select>
        
        <div className="n-toolbar-divider" />

        {/* Font size adjustments Dropdown */}
        <select 
          value={fontSize} 
          onChange={(e) => {
            const size = parseInt(e.target.value, 10);
            setFontSize(size);
            editor?.chain().focus().setFontSize(`${size}pt`).run();
          }}
          className="n-toolbar-select"
          style={{ width: '55px' }}
          title="Font Size"
        >
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        <div className="n-toolbar-divider" />

        {/* Basic formatting */}
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`n-toolbar-item ${isBold ? 'active' : ''}`} 
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`n-toolbar-item ${isItalic ? 'active' : ''}`} 
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`n-toolbar-item ${isUnderline ? 'active' : ''}`} 
          title="Underline"
        >
          <UnderlineIcon size={14} />
        </button>
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`n-toolbar-item ${editor?.isActive('strike') ? 'active' : ''}`} 
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>
        
        {/* Text Color Picker */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`n-toolbar-item ${isTextColorOpen ? 'active' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setIsTextColorOpen(!isTextColorOpen); }}
            title="Text Color"
          >
            <Baseline size={14} />
          </button>
          {isTextColorOpen && (
            <div className="docs-color-dropdown">
              {GOOGLE_COLORS.map(c => (
                <div 
                  key={c} 
                  className="docs-color-swatch" 
                  style={{ background: c }} 
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelectTextColor(c)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight Color Picker */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`n-toolbar-item ${isHighlightColorOpen ? 'active' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setIsHighlightColorOpen(!isHighlightColorOpen); }}
            title="Highlight Color"
          >
            <Highlighter size={14} />
          </button>
          {isHighlightColorOpen && (
            <div className="docs-color-dropdown">
              {GOOGLE_COLORS.map(c => (
                <div 
                  key={c} 
                  className="docs-color-swatch" 
                  style={{ background: c }} 
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelectHighlightColor(c)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="n-toolbar-divider" />
        
        {/* Links, Comments, Images */}
        <button className="n-toolbar-item" title="Insert Link" onClick={handleInsertLink}><LinkIcon size={14} /></button>
        <button className="n-toolbar-item" title="Add Comment" onClick={() => setSidebarTab('comments')}><MessageSquare size={14} /></button>
        <button className="n-toolbar-item" title="Insert Image" onClick={handleInsertImage}><ImageIcon size={14} /></button>

        {/* Table Operations */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`n-toolbar-item ${isTableMenuOpen ? 'active' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setIsTableMenuOpen(!isTableMenuOpen); }}
            title="Table Tools"
          >
            <TableIcon size={14} />
          </button>
          {isTableMenuOpen && (
            <div className="docs-style-dropdown" style={{ minWidth: '160px' }}>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                <span>Insert Table (3x3)</span>
              </button>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().addColumnAfter().run()}>
                <span>Add Column Right</span>
              </button>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().addRowAfter().run()}>
                <span>Add Row Below</span>
              </button>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().deleteColumn().run()} style={{ color: 'var(--n-error)' }}>
                <span>Delete Column</span>
              </button>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().deleteRow().run()} style={{ color: 'var(--n-error)' }}>
                <span>Delete Row</span>
              </button>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().deleteTable().run()} style={{ color: 'var(--n-error)' }}>
                <span>Delete Table</span>
              </button>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().mergeCells().run()}>
                <span>Merge Cells</span>
              </button>
              <button className="docs-style-item" onClick={() => editor?.chain().focus().splitCell().run()}>
                <span>Split Cell</span>
              </button>
            </div>
          )}
        </div>

        <div className="n-toolbar-divider" />

        {/* Alignments */}
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          className={`n-toolbar-item ${align === 'left' ? 'active' : ''}`} 
          title="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          className={`n-toolbar-item ${align === 'center' ? 'active' : ''}`} 
          title="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          className={`n-toolbar-item ${align === 'right' ? 'active' : ''}`} 
          title="Align Right"
        >
          <AlignRight size={14} />
        </button>
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
          className={`n-toolbar-item ${align === 'justify' ? 'active' : ''}`} 
          title="Justify"
        >
          <AlignJustify size={14} />
        </button>

        <div className="n-toolbar-divider" />
        
        {/* Line Spacing */}
        <select 
          value={lineSpacing} 
          onChange={(e) => {
            const spacing = e.target.value;
            setLineSpacing(spacing);
            editor?.chain().focus().setLineSpacing(spacing).run();
          }}
          className="n-toolbar-select"
          style={{ width: '85px' }}
          title="Line Spacing"
        >
          <option value="1.0">Single (1.0)</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2.0">Double (2.0)</option>
        </select>

        <div className="n-toolbar-divider" />

        {/* Lists & Indents */}
        <button className="n-toolbar-item" title="Bulleted List" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={14} /></button>
        <button className="n-toolbar-item" title="Numbered List" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
        <button 
          className={`n-toolbar-item ${editor?.isActive('taskList') ? 'active' : ''}`} 
          title="Checklist" 
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
        >
          <ListTodo size={14} />
        </button>
        <button className="n-toolbar-item" title="Decrease Indent" onClick={() => editor?.chain().focus().outdent().run()}><Outdent size={14} /></button>
        <button className="n-toolbar-item" title="Increase Indent" onClick={() => editor?.chain().focus().indent().run()}><Indent size={14} /></button>

        <div className="n-toolbar-divider" />
        
        {/* Clear formatting */}
        <button className="n-toolbar-item" title="Clear formatting" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}><Eraser size={14} /></button>
      </div>

      {/* Editor Layout Split */}
      <div className="docs-layout-split">
        
        {/* Left Outline panel */}
        <div className="docs-left-outline-panel">
          <span className="docs-outline-title">Outline Navigation</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {outline.map((item, idx) => (
              <div 
                key={idx} 
                className="docs-outline-item"
                style={{ paddingLeft: `${(item.level - 1) * 12 + 6}px`, cursor: 'pointer' }}
                onClick={() => {
                  if (onAddToast) onAddToast('Heading Focus', `Focused on outline section: "${item.text}"`, 'info');
                }}
              >
                {item.text}
              </div>
            ))}
            {outline.length === 0 && (
              <span style={{ fontSize: '11px', color: 'var(--n-text-light)', fontStyle: 'italic', paddingLeft: '8px' }}>
                Add lines starting with H1 or H2 styles to build outline.
              </span>
            )}
          </div>
        </div>

        {/* Center Writing view */}
        <div className="docs-scroll-canvas" onClick={handleImageClick}>
          {/* Horizontal Ruler */}
          <div className="docs-ruler-container">
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
            <span className="docs-ruler-tick" />
          </div>

          {/* Centered sheet with zoom scale transform */}
          <div 
            className="docs-paper-sheet animate-slide"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-in-out'
            }}
          >
            {/* Real WebSocket cursor indicator coordinates */}
            <div 
              style={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                gap: '12px', 
                padding: '6px 14px', 
                borderRadius: '8px', 
                border: '1px solid var(--n-border)',
                background: '#f8fafc',
                fontSize: '11px',
                color: 'var(--n-text-sub)',
                marginBottom: '20px',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {Object.entries(simulatedEdits.cursors).length === 0 ? (
                <span>No other active WebSocket editors in this room.</span>
              ) : (
                Object.entries(simulatedEdits.cursors).map(([peerName, cursorIndex]) => (
                  <span key={peerName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: peerName === 'Alice' ? '#ec4899' : peerName === 'Charlie' ? '#f59e0b' : '#4f46e5' 
                      }} 
                    />
                    {peerName} caret: <strong>char {cursorIndex}</strong>
                  </span>
                ))
              )}
            </div>
 
            {/* Main Rich Text Editor Canvas */}
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="docs-right-sidebar">
          <div className="docs-sidebar-tabs">
            <button 
              type="button" 
              onClick={() => setSidebarTab('comments')} 
              className={`docs-sidebar-tab-btn ${sidebarTab === 'comments' ? 'active' : ''}`}
            >
              <MessageSquare size={13} style={{ marginRight: '4px', display: 'inline' }} />
              Comments
            </button>
            <button 
              type="button" 
              onClick={() => setSidebarTab('history')} 
              className={`docs-sidebar-tab-btn ${sidebarTab === 'history' ? 'active' : ''}`}
            >
              <History size={13} style={{ marginRight: '4px', display: 'inline' }} />
              History
            </button>
            <button 
              type="button" 
              onClick={() => setSidebarTab('ai')} 
              className={`docs-sidebar-tab-btn ${sidebarTab === 'ai' ? 'active' : ''}`}
            >
              <Sparkles size={13} style={{ marginRight: '4px', display: 'inline' }} />
              Gemini AI
            </button>
          </div>

          {/* Active Tab */}
          {sidebarTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="docs-comment-thread">
                {comments.length === 0 ? (
                  <div style={{ color: 'var(--n-text-light)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                    No discussion threads.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="comment-card">
                      <div className="comment-card-meta">
                        <span className="comment-card-author">{c.author?.name || c.author}</span>
                        <span className="comment-card-time">{c.timestamp}</span>
                      </div>
                      <p className="comment-card-text">{c.text}</p>
                      <button 
                        onClick={() => handleResolveComment(c.id, c.author?.name || c.author)}
                        className="comment-resolve-btn"
                      >
                        Resolve
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="docs-comment-form">
                <input
                  type="text"
                  placeholder="Select text & type feedback..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="docs-comment-input"
                />
                <button type="submit" className="docs-comment-post-btn">Post</button>
              </form>
            </div>
          )}

          {sidebarTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="properties-label">Version control history</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ borderLeft: '2px solid var(--n-primary)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', display: 'block' }}>Current Revision v{doc.revision || 10}</span>
                  <span style={{ fontSize: '10px', color: 'var(--n-text-light)' }}>Edited by You just now</span>
                </div>
                <div style={{ borderLeft: '2px solid var(--n-border)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', display: 'block', color: 'var(--n-text-sub)' }}>Revision v9</span>
                  <span style={{ fontSize: '10px', color: 'var(--n-text-light)' }}>Synced with Alice 10 mins ago</span>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'ai' && (
            <div className="n-gemini-box">
              <div className="n-gemini-header">
                <Sparkle size={14} style={{ color: 'var(--n-primary)' }} />
                <span>Gemini Writer Assistant</span>
              </div>
              <form onSubmit={handleGeminiDraft} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  value={geminiInput}
                  onChange={(e) => setGeminiInput(e.target.value)}
                  placeholder={isGeminiWriting ? "Gemini is typing draft..." : "Write with Gemini (e.g. abstract goal)..."}
                  disabled={isGeminiWriting}
                  className="n-gemini-input"
                />
                <button 
                  type="submit" 
                  disabled={isGeminiWriting}
                  className="n-gemini-btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Sparkles size={12} />
                  {isGeminiWriting ? 'Drafting...' : 'Generate draft'}
                </button>
              </form>
            </div>
          )}
        </aside>

      </div>

    </div>
  );
}
