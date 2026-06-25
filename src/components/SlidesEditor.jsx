import React, { useState, useEffect, useRef } from 'react';
import { getSocket, emitElementDrag } from '../services/socket';
import { 
  Play, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  MousePointer, 
  Type, 
  Image as ImageIcon, 
  Shapes, 
  LayoutGrid,
  Sparkles,
  ChevronDown,
  Layers,
  Group as GroupIcon,
  BarChart2
} from 'lucide-react';

export default function SlidesEditor({ doc, onSave, simulatedEdits, otEngine, onAddToast }) {
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [activeElement, setActiveElement] = useState(null);
  const [speakerNotes, setSpeakerNotes] = useState('Add speaker notes for reference here...');
  const [transitionEffect, setTransitionEffect] = useState('fade');
  const [transitionClass, setTransitionClass] = useState('');

  const canvasId = 'fabric-slides-canvas';
  const fabricCanvas = useRef(null);

  const slidesRef = useRef([]);
  slidesRef.current = slides;

  const userStr = localStorage.getItem('nexus_user');
  const currentUser = userStr ? JSON.parse(userStr) : { name: 'You' };
  const username = currentUser.name || 'You';

  const themes = [
    { id: 'theme-white', name: 'Default White', bgColor: '#ffffff' },
    { id: 'theme-cream', name: 'Warm Cream', bgColor: '#fffcf9' },
    { id: 'theme-slate', name: 'Slate Gray', bgColor: '#f1f5f9' },
    { id: 'theme-coral', name: 'Coral Sunset', bgColor: '#fff1f2' }
  ];

  // Initialize slides from doc content on load
  const lastLoadedDocId = useRef(null);
  useEffect(() => {
    if (doc.id !== lastLoadedDocId.current) {
      lastLoadedDocId.current = doc.id;
      if (doc.content) {
        try {
          const parsed = JSON.parse(doc.content);
          if (parsed && parsed.slides) {
            setSlides(parsed.slides);
          } else if (Array.isArray(parsed)) {
            setSlides(parsed);
          } else {
            setSlides([]);
          }
        } catch (e) {
          setSlides(doc.slides || []);
        }
      } else {
        // Fallback default slide
        setSlides([
          {
            id: `slide-${Date.now()}`,
            title: 'Click to add title',
            subtitle: 'Click to add subtitle',
            bgColor: '#ffffff',
            fabricJSON: '',
            elements: [],
            order: 1,
            layout: 'blank'
          }
        ]);
      }
      setCurrentSlideIndex(0);
    }
  }, [doc.id, doc.content]);

  // Sync edits if simulation or sockets update slides
  useEffect(() => {
    if (simulatedEdits && simulatedEdits.slideDocId === doc.id) {
      setSlides(simulatedEdits.slides);
      
      const activeSlide = simulatedEdits.slides[currentSlideIndex];
      if (activeSlide && fabricCanvas.current) {
        const currentJSON = JSON.stringify(fabricCanvas.current.toJSON());
        if (activeSlide.fabricJSON && activeSlide.fabricJSON !== currentJSON) {
          fabricCanvas.current.loadFromJSON(activeSlide.fabricJSON, () => {
            fabricCanvas.current.renderAll();
          });
        }
      }
    }
  }, [simulatedEdits, doc.id, currentSlideIndex]);

  // Slide transition effect hook on change
  useEffect(() => {
    setTransitionClass(`animate-${transitionEffect}`);
    const timer = setTimeout(() => setTransitionClass(''), 500);
    return () => clearTimeout(timer);
  }, [currentSlideIndex, transitionEffect]);

  // Expose immediate save and register activeFabricCanvas
  useEffect(() => {
    window.triggerImmediateSave = async () => {
      if (fabricCanvas.current) {
        saveSlideState(fabricCanvas.current, true);
      }
    };
    return () => {
      if (window.triggerImmediateSave) {
        window.triggerImmediateSave = null;
      }
    };
  }, [currentSlideIndex]);

  // Initialize Fabric.js Canvas
  useEffect(() => {
    if (!window.fabric || isPresenting) return;

    const canvas = new window.fabric.Canvas(canvasId, {
      width: 800,
      height: 450,
      backgroundColor: '#ffffff'
    });
    fabricCanvas.current = canvas;

    const currentSlide = slides[currentSlideIndex];
    if (currentSlide) {
      if (currentSlide.fabricJSON) {
        canvas.loadFromJSON(currentSlide.fabricJSON, () => {
          canvas.backgroundColor = currentSlide.bgColor || '#ffffff';
          canvas.renderAll();
        });
      } else {
        // Render fallback default elements
        const titleText = new window.fabric.Textbox(currentSlide.title || 'Click to add title', {
          left: 100,
          top: 120,
          width: 600,
          fontSize: 38,
          fontWeight: 'bold',
          textAlign: 'center',
          fill: '#0f172a',
          fontFamily: 'Outfit'
        });
        
        const subtitleText = new window.fabric.Textbox(currentSlide.subtitle || 'Click to add subtitle', {
          left: 100,
          top: 240,
          width: 600,
          fontSize: 18,
          textAlign: 'center',
          fill: '#475569',
          fontFamily: 'Inter'
        });
        
        canvas.add(titleText);
        canvas.add(subtitleText);
        canvas.backgroundColor = currentSlide.bgColor || '#ffffff';
        canvas.renderAll();
        // Save initial state
        setTimeout(() => saveSlideState(canvas, true), 100);
      }
    }

    // Set selection listener
    canvas.on('selection:created', (e) => setActiveElement(e.target));
    canvas.on('selection:updated', (e) => setActiveElement(e.target));
    canvas.on('selection:cleared', () => setActiveElement(null));

    // Snapping / Alignment logic on drag
    const snapThreshold = 8;
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      const canvasObjects = canvas.getObjects().filter(o => o !== obj);
      
      canvasObjects.forEach(other => {
        // Horizontal Snapping
        if (Math.abs(obj.getCenterPoint().x - other.getCenterPoint().x) < snapThreshold) {
          obj.set({ left: other.getCenterPoint().x - (obj.width * obj.scaleX) / 2 });
        }
        // Vertical Snapping
        if (Math.abs(obj.getCenterPoint().y - other.getCenterPoint().y) < snapThreshold) {
          obj.set({ top: other.getCenterPoint().y - (obj.height * obj.scaleY) / 2 });
        }
      });

      // Broadcast element coordinate drags via sockets
      emitElementDrag(doc.id, username, { x: Math.round(obj.left), y: Math.round(obj.top) });
    });

    // Content modification hooks
    const handleModify = () => {
      saveSlideState(canvas);
    };
    canvas.on('object:modified', handleModify);
    canvas.on('text:changed', handleModify);
    canvas.on('object:added', handleModify);
    canvas.on('object:removed', handleModify);

    window.activeFabricCanvas = canvas;

    return () => {
      canvas.dispose();
      fabricCanvas.current = null;
      if (window.activeFabricCanvas === canvas) {
        window.activeFabricCanvas = null;
      }
    };
  }, [currentSlideIndex, slides.length, isPresenting]);

  const extractElements = (canvas) => {
    if (!canvas) return [];
    return canvas.getObjects().map((obj, idx) => {
      let type = 'shape';
      if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
        type = 'text';
      } else if (obj.type === 'image') {
        type = 'image';
      } else if (obj.type === 'group') {
        type = 'chart';
      }
      
      const id = obj.id || `el-${Date.now()}-${idx}`;
      obj.id = id;

      return {
        id,
        type,
        content: obj.text || obj.src || '',
        x: Math.round(obj.left),
        y: Math.round(obj.top),
        width: Math.round(obj.width * (obj.scaleX || 1)),
        height: Math.round(obj.height * (obj.scaleY || 1)),
        style: {
          fill: obj.fill || '#000000',
          fontSize: obj.fontSize || 14,
          fontFamily: obj.fontFamily || 'Arial',
          fontWeight: obj.fontWeight || 'normal',
          textAlign: obj.textAlign || 'left',
          stroke: obj.stroke || null,
          strokeWidth: obj.strokeWidth || 0,
          opacity: obj.opacity || 1
        }
      };
    });
  };

  const saveSlideState = (canvas, force = false) => {
    if (!canvas) return;
    const json = canvas.toJSON();
    const curSlide = slidesRef.current[currentSlideIndex] || {};
    
    // Find text values for thumbnail display
    let titleVal = curSlide.title || 'Blank Slide';
    let subtitleVal = curSlide.subtitle || '';
    const textboxes = canvas.getObjects('textbox');
    if (textboxes[0]) titleVal = textboxes[0].text;
    if (textboxes[1]) subtitleVal = textboxes[1].text;

    const elements = extractElements(canvas);

    const updatedSlides = slidesRef.current.map((slide, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...slide,
          id: slide.id || `slide-${Date.now()}-${idx}`,
          order: idx + 1,
          background: canvas.backgroundColor || '#ffffff',
          layout: slide.layout || 'blank',
          title: titleVal,
          subtitle: subtitleVal,
          fabricJSON: JSON.stringify(json),
          elements: elements
        };
      }
      return {
        ...slide,
        id: slide.id || `slide-${Date.now()}-${idx}`,
        order: idx + 1
      };
    });

    setSlides(updatedSlides);

    const presentation = {
      id: doc.id,
      title: doc.name,
      slides: updatedSlides,
      updatedAt: new Date().toISOString()
    };

    if (onSave) {
      const isAutoSaveEnabled = localStorage.getItem('nexus_autosave') !== 'false';
      if (force || isAutoSaveEnabled) {
        onSave(doc.id, presentation, 'slide-content-change');
      }
    }
  };

  const handleAddSlide = () => {
    if (fabricCanvas.current) {
      saveSlideState(fabricCanvas.current, true);
    }

    const newSlide = {
      id: `slide-${Date.now()}`,
      order: slidesRef.current.length + 1,
      bgColor: '#ffffff',
      fabricJSON: '',
      title: 'Click to add title',
      subtitle: 'Click to add subtitle',
      elements: [],
      layout: 'blank'
    };
    const updated = [...slidesRef.current, newSlide];
    setSlides(updated);
    setCurrentSlideIndex(updated.length - 1);
    
    otEngine.log(`Created slide ${updated.length}`, 'info');
    if (onAddToast) onAddToast('Slide Added', `Slide ${updated.length} created.`, 'success');
    
    const presentation = {
      id: doc.id,
      title: doc.name,
      slides: updated,
      updatedAt: new Date().toISOString()
    };
    if (onSave) onSave(doc.id, presentation, 'slide-add');
  };

  const handleDeleteSlide = () => {
    if (slidesRef.current.length <= 1) return;
    const updated = slidesRef.current.filter((_, idx) => idx !== currentSlideIndex);
    const reordered = updated.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSlides(reordered);
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
    
    otEngine.log(`Deleted slide ${currentSlideIndex + 1}.`, 'info');
    if (onAddToast) onAddToast('Slide Deleted', 'Active slide removed.', 'success');
    
    const presentation = {
      id: doc.id,
      title: doc.name,
      slides: reordered,
      updatedAt: new Date().toISOString()
    };
    if (onSave) onSave(doc.id, presentation, 'slide-delete');
  };

  const handleMoveSlide = (fromIndex, direction) => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= slidesRef.current.length) return;
    
    if (fabricCanvas.current) {
      saveSlideState(fabricCanvas.current, true);
    }

    const updated = [...slidesRef.current];
    const temp = updated[fromIndex];
    updated[fromIndex] = updated[toIndex];
    updated[toIndex] = temp;
    
    const finalSlides = updated.map((slide, idx) => ({
      ...slide,
      order: idx + 1
    }));
    
    setSlides(finalSlides);
    
    if (currentSlideIndex === fromIndex) {
      setCurrentSlideIndex(toIndex);
    } else if (currentSlideIndex === toIndex) {
      setCurrentSlideIndex(fromIndex);
    }
    
    const presentation = {
      id: doc.id,
      title: doc.name,
      slides: finalSlides,
      updatedAt: new Date().toISOString()
    };
    if (onSave) onSave(doc.id, presentation, 'slide-content-change');
  };

  const handleSwitchSlide = (targetIndex) => {
    if (targetIndex === currentSlideIndex) return;
    if (fabricCanvas.current) {
      saveSlideState(fabricCanvas.current, true);
    }
    setCurrentSlideIndex(targetIndex);
  };

  const handleSelectTheme = (themeBg) => {
    const canvas = fabricCanvas.current;
    if (canvas) {
      canvas.backgroundColor = themeBg;
      canvas.renderAll();
      saveSlideState(canvas, true);
      otEngine.log(`Theme set background: ${themeBg}`, 'info');
    }
  };

  const handleChangeLayout = (layoutType) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.clear();

    const bgColor = currentSlide.bgColor || '#ffffff';
    canvas.backgroundColor = bgColor;

    if (layoutType === 'title-slide') {
      const titleText = new window.fabric.Textbox('Click to add title', {
        left: 100,
        top: 120,
        width: 600,
        fontSize: 38,
        fontWeight: 'bold',
        textAlign: 'center',
        fill: '#0f172a',
        fontFamily: 'Outfit'
      });
      const subtitleText = new window.fabric.Textbox('Click to add subtitle', {
        left: 100,
        top: 240,
        width: 600,
        fontSize: 18,
        textAlign: 'center',
        fill: '#475569',
        fontFamily: 'Inter'
      });
      canvas.add(titleText);
      canvas.add(subtitleText);
    } else if (layoutType === 'title-body') {
      const titleText = new window.fabric.Textbox('Section Header Title', {
        left: 80,
        top: 40,
        width: 640,
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'left',
        fill: '#0f172a',
        fontFamily: 'Outfit'
      });
      const bodyText = new window.fabric.Textbox('• Bullet point description text goes here\n• Double-click to insert details\n• Press Enter to add new lines', {
        left: 80,
        top: 110,
        width: 640,
        fontSize: 16,
        textAlign: 'left',
        fill: '#334155',
        fontFamily: 'Inter'
      });
      canvas.add(titleText);
      canvas.add(bodyText);
    } else if (layoutType === 'two-columns') {
      const titleText = new window.fabric.Textbox('Comparing Core Frameworks', {
        left: 80,
        top: 40,
        width: 640,
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'left',
        fill: '#0f172a',
        fontFamily: 'Outfit'
      });
      const col1 = new window.fabric.Textbox('Left Column Topic:\n\n• React components\n• Declared virtual DOM\n• High performance', {
        left: 80,
        top: 110,
        width: 300,
        fontSize: 14,
        textAlign: 'left',
        fill: '#334155',
        fontFamily: 'Inter'
      });
      const col2 = new window.fabric.Textbox('Right Column Topic:\n\n• Vite tooling\n• HMR hot reload\n• Rolldown packaging', {
        left: 420,
        top: 110,
        width: 300,
        fontSize: 14,
        textAlign: 'left',
        fill: '#334155',
        fontFamily: 'Inter'
      });
      canvas.add(titleText);
      canvas.add(col1);
      canvas.add(col2);
    }

    canvas.renderAll();
    
    const json = canvas.toJSON();
    const elements = extractElements(canvas);
    const updatedSlides = slidesRef.current.map((slide, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...slide,
          background: bgColor,
          bgColor: bgColor,
          layout: layoutType,
          title: layoutType === 'blank' ? 'Blank Slide' : (canvas.getObjects('textbox')[0]?.text || slide.title),
          subtitle: canvas.getObjects('textbox')[1]?.text || '',
          fabricJSON: JSON.stringify(json),
          elements: elements
        };
      }
      return slide;
    });

    setSlides(updatedSlides);

    const presentation = {
      id: doc.id,
      title: doc.name,
      slides: updatedSlides,
      updatedAt: new Date().toISOString()
    };

    if (onSave) {
      onSave(doc.id, presentation, 'slide-content-change');
    }

    if (onAddToast) {
      onAddToast('Layout Changed', `Applied "${layoutType}" structure template.`, 'success');
    }
  };

  // Add editable textbox object
  const handleAddTextbox = () => {
    const canvas = fabricCanvas.current;
    if (canvas) {
      const textbox = new window.fabric.Textbox('Double-click to type', {
        left: 250,
        top: 200,
        width: 300,
        fontSize: 20,
        fill: '#334155',
        fontFamily: 'Inter'
      });
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      canvas.renderAll();
      saveSlideState(canvas, true);
    }
  };

  // Add customizable shapes
  const handleAddShape = (type) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    let shape = null;
    const fill = '#3b82f6';

    if (type === 'rect') {
      shape = new window.fabric.Rect({
        left: 200, top: 150, width: 120, height: 80, fill
      });
    } else if (type === 'circle') {
      shape = new window.fabric.Circle({
        left: 200, top: 150, radius: 50, fill
      });
    } else if (type === 'triangle') {
      shape = new window.fabric.Triangle({
        left: 200, top: 150, width: 100, height: 100, fill
      });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      saveSlideState(canvas, true);
    }
  };

  // Insert Image onto slide
  const handleAddImage = () => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const url = prompt('Enter Image URL:');
    if (url) {
      window.fabric.Image.fromURL(url, (img) => {
        img.set({
          left: 180,
          top: 120,
          scaleX: 0.5,
          scaleY: 0.5
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveSlideState(canvas, true);
      });
    }
  };

  // Insert vector-based editable bar chart group
  const handleAddChart = () => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const axis = new window.fabric.Rect({ left: 0, top: 80, width: 140, height: 4, fill: '#64748b' });
    const bar1 = new window.fabric.Rect({ left: 15, top: 30, width: 20, height: 50, fill: '#3b82f6' });
    const bar2 = new window.fabric.Rect({ left: 50, top: 50, width: 20, height: 30, fill: '#ef4444' });
    const bar3 = new window.fabric.Rect({ left: 85, top: 15, width: 20, height: 65, fill: '#10b981' });

    const chartGroup = new window.fabric.Group([axis, bar1, bar2, bar3], {
      left: 220,
      top: 180
    });

    canvas.add(chartGroup);
    canvas.setActiveObject(chartGroup);
    canvas.renderAll();
    saveSlideState(canvas, true);
    if (onAddToast) onAddToast('Chart Created', 'Injected slide vector bar chart.', 'success');
  };

  // Layers controls
  const handleBringToFront = () => {
    const canvas = fabricCanvas.current;
    if (canvas && activeElement) {
      canvas.bringToFront(activeElement);
      canvas.renderAll();
      saveSlideState(canvas, true);
    }
  };

  const handleSendToBack = () => {
    const canvas = fabricCanvas.current;
    if (canvas && activeElement) {
      canvas.sendToBack(activeElement);
      canvas.renderAll();
      saveSlideState(canvas, true);
    }
  };

  // Group / Ungroup
  const handleGroup = () => {
    const canvas = fabricCanvas.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeSelection') {
        activeObj.toGroup();
        canvas.requestRenderAll();
        saveSlideState(canvas, true);
        if (onAddToast) onAddToast('Objects Grouped', 'Grouped selection.', 'success');
      }
    }
  };

  const handleUngroup = () => {
    const canvas = fabricCanvas.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'group') {
        activeObj.toActiveSelection();
        canvas.requestRenderAll();
        saveSlideState(canvas, true);
        if (onAddToast) onAddToast('Group Split', 'Ungrouped items.', 'success');
      }
    }
  };

  const handleDeleteObject = () => {
    const canvas = fabricCanvas.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.remove(activeObj);
        canvas.discardActiveObject();
        canvas.renderAll();
        saveSlideState(canvas, true);
      }
    }
  };

  const currentSlide = slides[currentSlideIndex] || { title: 'Slide Title', subtitle: '', bgColor: '#ffffff' };

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      <style>{`
        .slides-edit-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f8fafc;
          overflow-y: auto;
        }
        .canvas-wrapper {
          box-shadow: 0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04);
          border: 1px solid var(--n-border);
          border-radius: 8px;
          background: #ffffff;
          overflow: hidden;
          width: 800px;
          height: 450px;
          position: relative;
        }
        .animate-fade {
          animation: fadeTransition 0.4s ease;
        }
        .animate-slide {
          animation: slideTransition 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-flip {
          animation: flipTransition 0.5s ease-in-out;
        }
        @keyframes fadeTransition {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideTransition {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes flipTransition {
          from { transform: rotateY(90deg); opacity: 0; }
          to { transform: rotateY(0); opacity: 1; }
        }
      `}</style>
      
      {/* Slides presentation mode overlay */}
      {isPresenting && (
        <div className="fixed inset-0 bg-[#0f172a] z-50 flex flex-col justify-center items-center p-8 animate-fade">
          <div className="w-full max-w-4xl flex justify-between items-center text-slate-400 mb-4 text-xs font-semibold">
            <span>NexusSlides Presentation Mode</span>
            <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
            <button 
              onClick={() => setIsPresenting(false)}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors text-xs font-semibold"
            >
              Exit Slideshow
            </button>
          </div>
          
          <div 
            className="w-full max-w-4xl aspect-[16/9] rounded-2xl flex flex-col justify-center items-center p-12 text-center shadow-2xl relative transition-all"
            style={{ backgroundColor: currentSlide.bgColor }}
          >
            <h1 className="text-5xl font-bold text-slate-800 mb-6">{currentSlide.title}</h1>
            <p className="text-xl text-slate-500 font-light">{currentSlide.subtitle}</p>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button 
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="bg-white/15 hover:bg-white/25 text-white disabled:opacity-30 p-2 rounded transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <button 
              onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === slides.length - 1}
              className="bg-white/15 hover:bg-white/25 text-white disabled:opacity-30 p-2 rounded transition-all"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Slide Deck Sidebar Thumbnails */}
      <div className="slides-thumb-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--n-border)' }}>
          <span className="properties-label" style={{ fontSize: '10px' }}>Slide Deck</span>
          <button 
            onClick={handleAddSlide}
            className="n-toolbar-item"
            style={{ width: '22px', height: '22px', padding: '0' }}
          >
            <Plus size={12} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {slides.map((slide, idx) => (
            <div key={slide.id || idx} className="slides-thumb-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
              <span className="slides-thumb-number" style={{ width: '12px', textAlign: 'right', fontSize: '10px' }}>{idx + 1}</span>
              <div
                onClick={() => handleSwitchSlide(idx)}
                className={`slides-thumb-card ${idx === currentSlideIndex ? 'active' : ''}`}
                style={{ 
                  backgroundColor: slide.bgColor || '#ffffff', 
                  flex: 1, 
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '4px',
                  height: '60px'
                }}
              >
                <span className="slides-thumb-title" style={{ fontSize: '9px', fontWeight: '700', textAlign: 'center', wordBreak: 'break-word', maxLines: 2 }}>{slide.title || 'Blank Slide'}</span>
                {slide.subtitle && (
                  <span style={{ fontSize: '7px', opacity: 0.6, color: 'var(--n-text-sub)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '80%' }}>
                    {slide.subtitle}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                {idx > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'up'); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px', fontSize: '10px', color: 'var(--n-text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Move Slide Up"
                  >
                    ▲
                  </button>
                )}
                {idx < slides.length - 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'down'); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px', fontSize: '10px', color: 'var(--n-text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Move Slide Down"
                  >
                    ▼
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide editing viewport */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Slides options toolbar */}
        <div className="n-toolbar-container" style={{ gap: '4px', padding: '6px 12px' }}>
          <button className="n-toolbar-item" title="Add slide" onClick={handleAddSlide}><Plus size={14} /></button>
          
          <div className="n-toolbar-divider" />

          <button className={`n-toolbar-item ${!activeElement ? 'active' : ''}`} title="Select mode"><MousePointer size={14} /></button>
          <button className="n-toolbar-item" title="Add Textbox" onClick={handleAddTextbox}><Type size={14} /></button>
          <button className="n-toolbar-item" title="Insert Image" onClick={handleAddImage}><ImageIcon size={14} /></button>
          
          {/* Shapes Menu */}
          <select 
            className="n-toolbar-select" 
            style={{ width: '100px' }}
            onChange={(e) => {
              if (e.target.value) {
                handleAddShape(e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="">Shapes...</option>
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="triangle">Triangle</option>
          </select>

          <button className="n-toolbar-item" title="Add Chart" onClick={handleAddChart}><BarChart2 size={14} /></button>

          <div className="n-toolbar-divider" />

          {/* Layer and Group modifiers */}
          <button className="n-toolbar-item" title="Bring to Front" onClick={handleBringToFront} disabled={!activeElement}><Layers size={14} /></button>
          <button className="n-toolbar-item" title="Send to Back" onClick={handleSendToBack} disabled={!activeElement}><Layers size={14} style={{ transform: 'scaleY(-1)' }} /></button>
          <button className="n-toolbar-item" title="Group Selected" onClick={handleGroup}><GroupIcon size={14} /></button>
          <button className="n-toolbar-item" title="Ungroup Selected" onClick={handleUngroup}><GroupIcon size={14} style={{ opacity: 0.5 }} /></button>

          <div className="n-toolbar-divider" />
          
          <button 
            onClick={() => setIsPresenting(true)}
            className="n-btn-primary"
            style={{ padding: '6px 12px', fontSize: '11px', boxShadow: 'none' }}
          >
            <Play size={12} fill="white" />
            Slideshow
          </button>

          <button 
            onClick={handleDeleteObject}
            disabled={!activeElement}
            className="n-toolbar-item"
            style={{ marginLeft: '6px', color: 'var(--n-error)' }}
            title="Delete Selected Object"
          >
            <Trash2 size={14} />
          </button>

          <button 
            onClick={handleDeleteSlide}
            disabled={slides.length <= 1}
            className="n-toolbar-item"
            style={{ marginLeft: 'auto', color: 'var(--n-error)' }}
            title="Delete slide"
          >
            <Trash2 size={14} />
            <span style={{ fontSize: '10px', marginLeft: '4px' }}>Delete Slide</span>
          </button>
        </div>

        {/* Slide Canvas Editor Workspace */}
        <div className="slides-edit-viewport">
          <div className={`canvas-wrapper ${transitionClass}`}>
            <canvas id={canvasId}></canvas>
          </div>

          {/* Speaker notes */}
          <div style={{ width: '800px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', flexShrink: 0 }}>
            <span className="properties-label" style={{ fontSize: '9px' }}>Speaker Notes</span>
            <textarea
              value={speakerNotes}
              onChange={(e) => setSpeakerNotes(e.target.value)}
              style={{
                width: '100%',
                height: '60px',
                background: 'white',
                border: '1px solid var(--n-border)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                resize: 'none',
                color: 'var(--n-text-sub)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar properties */}
      <aside className="slides-right-properties">
        <div className="properties-group">
          <span className="properties-label">Themes</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.bgColor)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'white',
                  border: currentSlide.bgColor === theme.bgColor ? '2px solid var(--n-primary)' : '1px solid var(--n-border)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: theme.bgColor, border: '1px solid var(--n-border)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--n-text-main)' }}>{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--n-border)', margin: '4px 0' }} />

        <div className="properties-group">
          <span className="properties-label">Slide Layout Template</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <select 
              value={currentSlide.layout || 'blank'}
              className="n-toolbar-select" 
              style={{ width: '100%', height: '36px', borderRadius: '8px' }}
              onChange={(e) => handleChangeLayout(e.target.value)}
            >
              <option value="title-slide">Title Slide (Center title + subtitle)</option>
              <option value="title-body">Title & Body (Header + description)</option>
              <option value="two-columns">Two Columns (Title + comparison columns)</option>
              <option value="blank">Blank Slide (Reset canvas)</option>
            </select>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--n-border)', margin: '4px 0' }} />

        <div className="properties-group">
          <span className="properties-label">Slide Transition Effect</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <select 
              value={transitionEffect}
              className="n-toolbar-select" 
              style={{ width: '100%', height: '36px', borderRadius: '8px' }}
              onChange={(e) => {
                setTransitionEffect(e.target.value);
                if (onAddToast) onAddToast('Transition Applied', `Applied "${e.target.value}" slide transition effect.`, 'success');
              }}
            >
              <option value="none">No Transition (Instant)</option>
              <option value="fade">Dissolve Fade</option>
              <option value="slide">Slide Left-to-Right</option>
              <option value="flip">3D Flip Page</option>
            </select>
          </div>
        </div>
      </aside>

    </div>
  );
}
