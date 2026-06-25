import React, { useState, useEffect, useRef } from 'react';
import { getSocket, emitSelection } from '../services/socket';
import { isCellReference, cellToIndices, indicesToCell } from '../engine/formulaEvaluator';

export default function SheetsEditor({ doc, onSave, simulatedEdits, otEngine, onAddToast }) {
  const containerId = 'luckysheet-container';
  const saveTimeoutRef = useRef(null);

  const [isReady, setIsReady] = useState(false);

  const userStr = localStorage.getItem('nexus_user');
  const currentUser = userStr ? JSON.parse(userStr) : { name: 'You' };
  const username = currentUser.name || 'You';

  useEffect(() => {
    setIsReady(false);
  }, [doc.id]);

  // Helper to check if data is in legacy cell map format
  const isCellMap = (obj) => {
    if (Array.isArray(obj)) return false;
    if (typeof obj !== 'object' || obj === null) return false;
    const keys = Object.keys(obj);
    if (keys.length === 0) return true;
    return keys.every(k => /^[A-Z]+[0-9]+$/.test(k));
  };

  // Convert legacy cell map to Luckysheet sheet configuration
  const cellMapToLuckysheet = (cellMap) => {
    const celldata = [];
    Object.entries(cellMap).forEach(([cellId, cellObj]) => {
      const idx = cellToIndices(cellId);
      if (idx) {
        const val = cellObj?.rawValue || cellObj?.value || '';
        let cellDataValue = {
          v: val,
          m: val,
          ct: { fa: '@', t: 'g' }
        };
        if (typeof val === 'string' && val.startsWith('=')) {
          cellDataValue.f = val;
          cellDataValue.v = '';
        }
        celldata.push({
          r: idx.row,
          c: idx.col,
          v: cellDataValue
        });
      }
    });

    return [
      {
        name: 'Sheet1',
        color: '',
        status: 1,
        order: 0,
        column: 18,
        row: 50,
        celldata: celldata,
        defaultRowHeight: 20,
        defaultColWidth: 90
      }
    ];
  };

  // Convert Luckysheet sheet configuration back to cell map (for backup/compatibility)
  const luckysheetToCellMap = (sheets) => {
    const cellMap = {};
    if (!sheets || !sheets[0] || !sheets[0].data) return cellMap;
    const data = sheets[0].data;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const cell = data[r][c];
        if (cell && (cell.v !== null && cell.v !== undefined || cell.f)) {
          const cellId = indicesToCell(r, c);
          cellMap[cellId] = {
            rawValue: cell.f || String(cell.v)
          };
        }
      }
    }
    return cellMap;
  };

  // Expose immediate save globally
  useEffect(() => {
    window.triggerImmediateSave = async () => {
      if (window.luckysheet && isReady) {
        const fileData = window.luckysheet.getluckysheetfile();
        await onSave(doc.id, fileData, 'cell-change');
      }
    };
    return () => {
      if (window.triggerImmediateSave) {
        window.triggerImmediateSave = null;
      }
    };
  }, [isReady, doc.id, onSave]);

  // Initialize Luckysheet workbook
  useEffect(() => {
    if (!window.luckysheet) {
      if (onAddToast) onAddToast('Luckysheet Error', 'Luckysheet script failed to load from CDN.', 'error');
      return;
    }

    let initialData = [];
    try {
      const parsed = JSON.parse(doc.content);
      if (isCellMap(parsed)) {
        initialData = cellMapToLuckysheet(parsed);
      } else {
        initialData = parsed;
      }
    } catch (e) {
      // Create empty sheet structure
      initialData = cellMapToLuckysheet({});
    }

    window.luckysheet.create({
      container: containerId,
      title: doc.name || 'Nexus Spreadsheet',
      lang: 'en',
      data: initialData,
      showinfobar: false,
      showtoolbar: true,
      showsheetbar: true,
      showstatisticBar: true,
      sheetFormulaBar: true,
      enableAddRow: true,
      enableAddCol: true,
      allowEdit: true,
      gridKey: `sheets-${doc.id}`,
      hook: {
        workbookCreateAfter: () => {
          setIsReady(true);
        },
        cellUpdated: () => {
          debouncedSave();
        },
        rangeSelect: (sheet, range) => {
          if (range && range.length > 0) {
            const firstRange = range[0];
            const cellId = indicesToCell(firstRange.row[0], firstRange.column[0]);
            emitSelection(doc.id, username, cellId);
          }
        }
      }
    });

    // Window resize handler
    const handleResize = () => {
      if (window.luckysheet) {
        window.luckysheet.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [doc.id]);

  // Handle remote simulated edits & Websocket content sync
  useEffect(() => {
    if (!window.luckysheet || !isReady) return;

    if (simulatedEdits && simulatedEdits.sheetDocId === doc.id) {
      const incoming = simulatedEdits.cells;
      if (!incoming) return;

      if (isCellMap(incoming)) {
        // Apply cell map changes directly
        Object.entries(incoming).forEach(([cellId, cellObj]) => {
          const idx = cellToIndices(cellId);
          if (idx) {
            const val = cellObj?.rawValue || cellObj?.value || '';
            window.luckysheet.setCellValue(idx.row, idx.col, val);
          }
        });
        window.luckysheet.refresh();
      } else {
        // Apply workbook sheets update if values differ
        incoming.forEach((inSheet, sIdx) => {
          const curSheets = window.luckysheet.getluckysheetfile();
          const curSheet = curSheets[sIdx];
          if (!curSheet) return;

          const celldata = inSheet.celldata || [];
          celldata.forEach(cell => {
            const { r, c, v } = cell;
            const curCell = window.luckysheet.getCellValue(r, c);
            const incomingVal = v?.v || v?.f || '';
            const currentVal = curCell?.v || curCell?.f || '';
            
            if (incomingVal !== currentVal) {
              window.luckysheet.setCellValue(r, c, v);
            }
          });
        });
        window.luckysheet.refresh();
      }
    }
  }, [simulatedEdits, doc.id, isReady]);

  // Debounced save workbook JSON state
  const debouncedSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (window.luckysheet && isReady) {
        const isAutoSaveEnabled = localStorage.getItem('nexus_autosave') !== 'false';
        if (isAutoSaveEnabled) {
          const fileData = window.luckysheet.getluckysheetfile();
          // Save the full Luckysheet JSON configuration to the database
          onSave(doc.id, fileData, 'cell-change');
          otEngine.log('Spreadsheet autosaved and broadcasted.', 'info');
        }
      }
    }, 1000); // 1s debounce
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full relative" style={{ minHeight: '600px', position: 'relative' }}>
      <style>{`
        /* Luckysheet style adjustment overrides to integrate with dark/light themes */
        #luckysheet-container {
          margin: 0;
          padding: 0;
          position: absolute;
          width: 100%;
          height: 100%;
          left: 0;
          top: 0;
          box-sizing: border-box;
        }
        .luckysheet-share-logo {
          display: none !important;
        }
      `}</style>
      
      {/* Container where Luckysheet will mount */}
      <div id={containerId}></div>

      {/* Real-time peer active cell indicators mapping panel */}
      {simulatedEdits && simulatedEdits.selections && (
        <div 
          style={{ 
            position: 'absolute', 
            bottom: '40px', 
            right: '20px', 
            background: 'rgba(255, 255, 255, 0.9)', 
            padding: '6px 12px', 
            border: '1px solid var(--n-border)', 
            borderRadius: '8px', 
            fontSize: '11px',
            color: 'var(--n-text-sub)',
            zIndex: 1000,
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ fontWeight: '600' }}>Collaborators:</span>
          {Object.entries(simulatedEdits.selections).length === 0 ? (
            <span style={{ fontStyle: 'italic' }}>No selections</span>
          ) : (
            Object.entries(simulatedEdits.selections).map(([peerName, selCellId]) => (
              <span key={peerName} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: peerName === 'Alice' ? 'var(--n-docs)' : 'var(--n-slides)' 
                  }} 
                />
                {peerName} ({selCellId})
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}
