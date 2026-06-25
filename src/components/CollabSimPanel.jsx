import React, { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Activity, ShieldAlert } from 'lucide-react';

export default function CollabSimPanel({ 
  engine, 
  logs, 
  onClearLogs, 
  activeBots, 
  onChangeBots,
  onTriggerPreset,
  currentDocType 
}) {
  const [speed, setSpeed] = useState(2000); // ms
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        if (onChangeBots) {
          onChangeBots(true);
        }
      }, speed);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, speed, onChangeBots]);

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
    engine.log(isRunning ? "Collaboration simulation paused." : "Collaboration simulation started.", "info");
  };

  const handleSpeedChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setSpeed(val);
    engine.log(`Simulation frequency adjusted to ${val}ms.`, "info");
  };

  const getLogBadgeStyle = (type) => {
    switch (type) {
      case 'conflict':
        return { backgroundColor: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' };
      case 'sync':
        return { backgroundColor: '#ecfdf5', color: '#10b981', borderColor: '#a7f3d0' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' };
    }
  };

  return (
    <div className="sim-panel-container h-full">
      {/* Header */}
      <div className="sim-panel-header">
        <h3 className="sim-panel-title" style={{ margin: 0, gap: '6px' }}>
          <Activity size={16} style={{ color: 'var(--n-primary)' }} />
          OT Simulator Console
        </h3>
        <span 
          className="sim-panel-badge"
          style={{ 
            backgroundColor: isRunning ? '#ecfdf5' : '#f1f5f9', 
            color: isRunning ? '#065f46' : '#475569',
            borderColor: isRunning ? '#a7f3d0' : '#e2e8f0'
          }}
        >
          {isRunning ? 'Active' : 'Idle'}
        </span>
      </div>

      {/* Control Panel */}
      <div className="sim-controls-section">
        {/* Toggle Button */}
        <button
          onClick={toggleSimulation}
          className="sim-play-btn"
          style={{
            backgroundColor: isRunning ? '#e0e7ff' : 'var(--n-primary)',
            color: isRunning ? 'var(--n-primary)' : 'white',
          }}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
          {isRunning ? 'Pause Simulator' : 'Auto Edit Simulator'}
        </button>

        {/* Speed Slider */}
        <div className="sim-slider-row">
          <div className="sim-slider-labels">
            <span>Edit Frequency</span>
            <span>{speed / 1000}s</span>
          </div>
          <input
            type="range"
            min="1000"
            max="5000"
            step="500"
            value={speed}
            onChange={handleSpeedChange}
            className="sim-slider-input"
          />
        </div>

        {/* Active Bots Checkboxes */}
        <div className="sim-peers-row">
          <span className="sim-peers-title">
            Simulator Bots
          </span>
          <div className="sim-peers-checks">
            <label className="sim-peer-label">
              <input
                type="checkbox"
                checked={activeBots.Alice}
                onChange={() => onChangeBots && onChangeBots(null, 'Alice')}
                style={{ cursor: 'pointer', accentColor: 'var(--n-primary)' }}
              />
              Alice (Bot A)
            </label>
            <label className="sim-peer-label">
              <input
                type="checkbox"
                checked={activeBots.Charlie}
                onChange={() => onChangeBots && onChangeBots(null, 'Charlie')}
                style={{ cursor: 'pointer', accentColor: 'var(--n-primary)' }}
              />
              Charlie (Bot B)
            </label>
          </div>
        </div>
      </div>

      {/* Preset Conflict Scenarios Trigger */}
      <div className="sim-presets-section">
        <span className="sim-presets-title">
          <ShieldAlert size={13} style={{ color: 'var(--n-primary)' }} />
          OT Collision Presets
        </span>
        
        {currentDocType === 'docs' && (
          <button
            onClick={() => onTriggerPreset('docs-collision')}
            className="sim-preset-btn"
          >
            <strong>Docs:</strong> Concurrent Insert Collision
          </button>
        )}

        {currentDocType === 'sheets' && (
          <button
            onClick={() => onTriggerPreset('sheets-collision')}
            className="sim-preset-btn"
          >
            <strong>Sheets:</strong> Cell <strong>A1</strong> Overwrite conflict
          </button>
        )}

        {currentDocType === 'slides' && (
          <button
            onClick={() => onTriggerPreset('slides-collision')}
            className="sim-preset-btn"
          >
            <strong>Slides:</strong> Concurrent Shape Drag conflict
          </button>
        )}
      </div>

      {/* Operational Transformation Console Logs */}
      <div className="sim-console-section">
        <div className="sim-console-header">
          <span>Transformation Log logs</span>
          <button
            onClick={onClearLogs}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--n-text-light)' }}
            title="Clear Logs"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="sim-console-terminal">
          {logs.length === 0 ? (
            <div style={{ color: 'var(--n-text-light)', textAlign: 'center', padding: '24px 0', fontStyle: 'italic' }}>
              Terminal waiting for conflict logs...
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="sim-log-item">
                <div className="sim-log-meta">
                  <span className="sim-log-time">{log.timestamp}</span>
                  <span 
                    className="sim-log-badge"
                    style={getLogBadgeStyle(log.type)}
                  >
                    {log.type}
                  </span>
                </div>
                <span className="sim-log-text">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
