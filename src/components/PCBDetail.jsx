// ============================================
// PCBDetail.jsx — Full PCB Info + State Control
// ============================================
import { STATE_COLORS, STATE_ICONS, PRIORITY_LEVELS, VALID_TRANSITIONS } from "../data/pcbData";

export default function PCBDetail({ process, onStateChange, onTerminate }) {
  if (!process) {
    return (
      <div style={{
        background: '#09090f',
        border: '1px solid #1e1e3f',
        borderRadius: 16,
        padding: 32,
        textAlign: 'center',
        fontFamily: '"Courier New", monospace',
        color: '#2a2a4a',
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🖱️</div>
        <div style={{ fontSize: 13 }}>Click any process to inspect its PCB</div>
      </div>
    );
  }

  const sc = STATE_COLORS[process.state];
  const transitions = VALID_TRANSITIONS[process.state] || [];

  const Field = ({ label, value, accent }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid #0f0f1e',
    }}>
      <span style={{ color: '#444', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color: accent || '#94a3b8', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      background: '#09090f',
      border: `1px solid ${sc.border}44`,
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '"Courier New", monospace',
      boxShadow: `0 0 20px ${sc.glow}22`,
      animation: 'popIn 0.3s ease',
    }}>
      {/* PCB Header */}
      <div style={{
        padding: '14px 20px',
        background: `linear-gradient(90deg, ${sc.bg}, #09090f)`,
        borderBottom: `1px solid ${sc.border}44`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: sc.text, fontWeight: 700, fontSize: 14 }}>📋 PCB #{process.pid}</div>
          <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{process.name}</div>
        </div>
        <span style={{
          background: sc.bg,
          border: `1px solid ${sc.border}`,
          color: sc.text,
          borderRadius: 8,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 700,
          boxShadow: `0 0 12px ${sc.glow}55`,
        }}>
          {STATE_ICONS[process.state]} {process.state}
        </span>
      </div>

      <div style={{ padding: '14px 20px' }}>
        {/* Core Info */}
        <div style={{ color: '#6366f1', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>◆ CORE INFO</div>
        <Field label="Process ID"     value={`#${process.pid}`}         accent="#6366f1" />
        <Field label="Priority"       value={`P${process.priority} — ${PRIORITY_LEVELS[process.priority]?.label}`}
                                                                         accent={PRIORITY_LEVELS[process.priority]?.color} />
        <Field label="Program Counter" value={process.programCounter}   accent="#22d3ee" />

        {/* Memory */}
        <div style={{ color: '#6366f1', fontSize: 9, letterSpacing: 2, margin: '12px 0 8px' }}>◆ MEMORY</div>
        <Field label="Start Address"  value={`${process.memoryStart} KB`} />
        <Field label="End Address"    value={`${process.memoryEnd} KB`} />
        <Field label="Allocated"      value={`${process.memoryEnd - process.memoryStart} KB`} accent="#4ade80" />

        {/* CPU Registers */}
        <div style={{ color: '#6366f1', fontSize: 9, letterSpacing: 2, margin: '12px 0 8px' }}>◆ CPU REGISTERS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {Object.entries(process.registers).map(([reg, val]) => (
            <div key={reg} style={{
              background: '#0f0f1e', borderRadius: 6, padding: '6px 10px',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700 }}>{reg}</span>
              <span style={{ color: '#64748b', fontSize: 10 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Timing */}
        <div style={{ color: '#6366f1', fontSize: 9, letterSpacing: 2, margin: '12px 0 8px' }}>◆ TIMING</div>
        <Field label="Burst Time"     value={`${process.burstTime} ms`} />
        <Field label="Remaining"      value={`${process.remainingTime} ms`} accent={sc.text} />
        <Field label="Waiting Time"   value={`${process.waitingTime} ms`} />

        {/* Open Files */}
        {process.openFiles.length > 0 && (
          <>
            <div style={{ color: '#6366f1', fontSize: 9, letterSpacing: 2, margin: '12px 0 8px' }}>◆ OPEN FILES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {process.openFiles.map(f => (
                <span key={f} style={{
                  background: '#111128', border: '1px solid #1e1e3f',
                  color: '#64748b', borderRadius: 5, padding: '2px 8px', fontSize: 9,
                }}>📄 {f}</span>
              ))}
            </div>
          </>
        )}

        {/* State Transition Controls */}
        {transitions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#6366f1', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>◆ TRANSITION TO</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {transitions.map(nextState => {
                const nc = STATE_COLORS[nextState];
                return (
                  <button key={nextState}
                    onClick={() => onStateChange(process.pid, nextState)}
                    style={{
                      background: nc.bg,
                      border: `1px solid ${nc.border}`,
                      color: nc.text,
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      letterSpacing: 1,
                      transition: 'all 0.2s',
                      fontFamily: 'monospace',
                    }}
                    onMouseEnter={e => e.target.style.boxShadow = `0 0 12px ${nc.glow}88`}
                    onMouseLeave={e => e.target.style.boxShadow = 'none'}
                  >
                    → {STATE_ICONS[nextState]} {nextState}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Terminate */}
        {process.state !== 'TERMINATED' && (
          <button
            onClick={() => onTerminate(process.pid)}
            style={{
              marginTop: 12,
              width: '100%',
              background: '#1f0a0a',
              border: '1px solid #ef444466',
              color: '#fca5a5',
              borderRadius: 8,
              padding: '8px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 1,
              fontFamily: 'monospace',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.target.style.boxShadow = '0 0 12px #ef444466'}
            onMouseLeave={e => e.target.style.boxShadow = 'none'}
          >
            💀 TERMINATE PROCESS
          </button>
        )}
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
