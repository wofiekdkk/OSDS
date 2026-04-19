// ============================================
// ProcessTable.jsx — Live Process Table
// ============================================
import { useState } from "react";
import { STATE_COLORS, STATE_ICONS, PRIORITY_LEVELS } from "../data/pcbData";

export default function ProcessTable({ processes, onSelectProcess, selectedPid }) {
  const [sortKey, setSortKey] = useState('pid');

  const sorted = [...processes].sort((a, b) => {
    if (sortKey === 'pid') return a.pid - b.pid;
    if (sortKey === 'priority') return a.priority - b.priority;
    if (sortKey === 'state') return a.state.localeCompare(b.state);
    return 0;
  });

  return (
    <div style={{
      background: '#09090f',
      border: '1px solid #1e1e3f',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '"Courier New", monospace',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        background: 'linear-gradient(90deg,#0f0f22,#160a28)',
        borderBottom: '1px solid #1e1e3f',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🗂️</span>
          <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>PROCESS TABLE</span>
          <span style={{
            background: '#7c3aed22', border: '1px solid #7c3aed55',
            color: '#a78bfa', borderRadius: 20, padding: '1px 10px', fontSize: 10,
          }}>{processes.length} active</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['pid', 'priority', 'state'].map(k => (
            <button key={k} onClick={() => setSortKey(k)} style={{
              background: sortKey === k ? '#7c3aed33' : 'transparent',
              border: `1px solid ${sortKey === k ? '#7c3aed' : '#2a2a4a'}`,
              color: sortKey === k ? '#a78bfa' : '#555',
              borderRadius: 6, padding: '2px 8px', fontSize: 9,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
            }}>↕ {k}</button>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '70px 130px 130px 70px 110px 110px 90px',
        padding: '8px 20px',
        borderBottom: '1px solid #111128',
        background: '#06060e',
      }}>
        {['PID','PROCESS','STATE','PRI','MEMORY','BURST','PC'].map(h => (
          <div key={h} style={{ color: '#333', fontSize: 9, letterSpacing: 2, fontWeight: 700 }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: 36, color: '#2a2a4a', fontSize: 13 }}>
            No processes. Create one above ↑
          </div>
        )}
        {sorted.map(proc => {
          const sc = STATE_COLORS[proc.state];
          const isSelected = selectedPid === proc.pid;
          const isRunning = proc.state === 'RUNNING';

          return (
            <div
              key={proc.pid}
              onClick={() => onSelectProcess(proc)}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 130px 130px 70px 110px 110px 90px',
                padding: '11px 20px',
                borderBottom: '1px solid #0d0d1e',
                cursor: 'pointer',
                transition: 'background 0.2s',
                background: isSelected ? `${sc.bg}` : 'transparent',
                borderLeft: `3px solid ${isSelected ? sc.border : 'transparent'}`,
                animation: 'slideIn 0.35s ease',
              }}
              onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#0f0f1e')}
              onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ color: '#6366f1', fontSize: 12, fontWeight: 700 }}>#{proc.pid}</div>

              <div style={{ color: '#e2e8f0', fontSize: 12 }}>{proc.name}</div>

              <div>
                <span style={{
                  background: sc.bg,
                  border: `1px solid ${sc.border}`,
                  color: sc.text,
                  borderRadius: 5,
                  padding: '2px 8px',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  boxShadow: isRunning ? `0 0 10px ${sc.glow}66` : 'none',
                }}>
                  {STATE_ICONS[proc.state]} {proc.state}
                </span>
              </div>

              <div style={{ color: PRIORITY_LEVELS[proc.priority]?.color || '#fff', fontSize: 11, fontWeight: 700 }}>
                P{proc.priority}
              </div>

              <div style={{ color: '#94a3b8', fontSize: 11 }}>
                {proc.memoryStart}–{proc.memoryEnd}
                <span style={{ color: '#334155', marginLeft: 3 }}>({proc.memoryEnd - proc.memoryStart}KB)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
                <div style={{ fontSize: 9, color: '#475569' }}>{proc.remainingTime}/{proc.burstTime}ms</div>
                <div style={{ background: '#111128', borderRadius: 3, height: 3, width: 70 }}>
                  <div style={{
                    background: sc.border, borderRadius: 3, height: '100%',
                    width: `${(proc.remainingTime / proc.burstTime) * 100}%`,
                    transition: 'width 0.5s',
                    boxShadow: `0 0 5px ${sc.glow}`,
                  }} />
                </div>
              </div>

              <div style={{ color: '#334155', fontSize: 9, fontFamily: 'monospace' }}>{proc.programCounter}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
