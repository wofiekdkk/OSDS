// ============================================
// ContextSwitch.jsx — Animated Context Switch
// ============================================
import { useState, useEffect, useRef } from "react";
import { STATE_COLORS } from "../data/pcbData";

export default function ContextSwitch({ processes, onContextSwitch }) {
  const [fromPid, setFromPid] = useState('');
  const [toPid, setToPid]   = useState('');
  const [phase, setPhase]   = useState('idle'); // idle | saving | loading | done
  const [log, setLog]       = useState([]);
  const logRef = useRef(null);

  const runningProcs = processes.filter(p => p.state === 'RUNNING');
  const readyProcs   = processes.filter(p => p.state === 'READY');

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const addLog = (msg, color = '#64748b') => {
    setLog(prev => [...prev, { msg, color, ts: Date.now() }]);
  };

  const handleSwitch = async () => {
    if (!fromPid || !toPid) return;
    const from = processes.find(p => p.pid === parseInt(fromPid));
    const to   = processes.find(p => p.pid === parseInt(toPid));
    if (!from || !to) return;

    setPhase('saving');
    addLog(`⚡ Context Switch initiated`, '#f59e0b');
    addLog(`   CPU → Saving state of Process #${from.pid} (${from.name})`, '#f97316');
    await delay(800);
    addLog(`   PCB #${from.pid} → PC: ${from.programCounter}`, '#94a3b8');
    addLog(`   PCB #${from.pid} → Registers saved`, '#94a3b8');
    addLog(`   PCB #${from.pid} → State: RUNNING → READY`, '#4ade80');
    await delay(700);

    setPhase('loading');
    addLog(`   Loading state of Process #${to.pid} (${to.name})`, '#3b82f6');
    await delay(700);
    addLog(`   PCB #${to.pid} → PC restored: ${to.programCounter}`, '#94a3b8');
    addLog(`   PCB #${to.pid} → Registers restored`, '#94a3b8');
    addLog(`   PCB #${to.pid} → State: READY → RUNNING`, '#f59e0b');
    await delay(600);

    setPhase('done');
    addLog(`✅ Context Switch complete! CPU now running #${to.pid}`, '#4ade80');
    onContextSwitch(parseInt(fromPid), parseInt(toPid));

    setTimeout(() => setPhase('idle'), 1500);
  };

  const delay = ms => new Promise(r => setTimeout(r, ms));

  const PhaseIndicator = ({ label, activePhase, thisPhase, color }) => (
    <div style={{
      padding: '8px 16px',
      borderRadius: 8,
      background: activePhase === thisPhase ? `${color}22` : '#0d0d1a',
      border: `1px solid ${activePhase === thisPhase ? color : '#1a1a2e'}`,
      color: activePhase === thisPhase ? color : '#2a2a4a',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1,
      transition: 'all 0.3s',
      boxShadow: activePhase === thisPhase ? `0 0 12px ${color}44` : 'none',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {activePhase === thisPhase && (
        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
      )}
      {label}
    </div>
  );

  return (
    <div style={{
      background: '#09090f',
      border: '1px solid #1e1e3f',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '"Courier New", monospace',
    }}>
      <div style={{
        padding: '14px 20px',
        background: 'linear-gradient(90deg,#0f0f22,#160a28)',
        borderBottom: '1px solid #1e1e3f',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 16 }}>🔁</span>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>CONTEXT SWITCH</span>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Phase Steps */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <PhaseIndicator label="1. SAVE STATE"  activePhase={phase} thisPhase="saving"  color="#f97316" />
          <span style={{ color: '#1a1a2e', fontSize: 16 }}>→</span>
          <PhaseIndicator label="2. LOAD STATE"  activePhase={phase} thisPhase="loading" color="#3b82f6" />
          <span style={{ color: '#1a1a2e', fontSize: 16 }}>→</span>
          <PhaseIndicator label="3. RESUME"      activePhase={phase} thisPhase="done"    color="#4ade80" />
        </div>

        {/* Visual CPU */}
        <div style={{
          background: '#0d0d1a',
          border: '1px solid #1a1a2e',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'center',
        }}>
          {/* FROM Process */}
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            {fromPid ? (() => {
              const p = processes.find(x => x.pid === parseInt(fromPid));
              const sc = p ? STATE_COLORS[p.state] : STATE_COLORS.RUNNING;
              return (
                <div style={{
                  background: sc.bg, border: `1px solid ${sc.border}`,
                  borderRadius: 8, padding: '8px 12px',
                  color: sc.text, fontSize: 10, fontWeight: 700,
                }}>
                  <div>#{p?.pid}</div>
                  <div style={{ color: '#64748b', marginTop: 2 }}>{p?.name}</div>
                </div>
              );
            })() : (
              <div style={{ color: '#2a2a4a', fontSize: 10 }}>Select FROM</div>
            )}
          </div>

          {/* CPU Box */}
          <div style={{
            background: phase === 'saving' ? '#1f1000' : phase === 'loading' ? '#0a0f1f' : phase === 'done' ? '#0a1f0a' : '#111120',
            border: `2px solid ${phase === 'saving' ? '#f59e0b' : phase === 'loading' ? '#3b82f6' : phase === 'done' ? '#4ade80' : '#1e1e3f'}`,
            borderRadius: 12,
            padding: '12px 20px',
            textAlign: 'center',
            transition: 'all 0.4s',
            boxShadow: phase !== 'idle' ? `0 0 20px ${phase === 'saving' ? '#f59e0b44' : '#3b82f644'}` : 'none',
            minWidth: 90,
          }}>
            <div style={{ fontSize: 20 }}>🖥️</div>
            <div style={{ color: '#a78bfa', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>CPU</div>
            <div style={{ color: '#334155', fontSize: 8, marginTop: 2 }}>
              {phase === 'saving' ? 'SAVING...' : phase === 'loading' ? 'LOADING...' : phase === 'done' ? 'DONE!' : 'READY'}
            </div>
          </div>

          {/* Arrows */}
          <div style={{ color: '#1e1e3f', fontSize: 20 }}>⟷</div>

          {/* TO Process */}
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            {toPid ? (() => {
              const p = processes.find(x => x.pid === parseInt(toPid));
              const sc = p ? STATE_COLORS[p.state] : STATE_COLORS.READY;
              return (
                <div style={{
                  background: sc.bg, border: `1px solid ${sc.border}`,
                  borderRadius: 8, padding: '8px 12px',
                  color: sc.text, fontSize: 10, fontWeight: 700,
                }}>
                  <div>#{p?.pid}</div>
                  <div style={{ color: '#64748b', marginTop: 2 }}>{p?.name}</div>
                </div>
              );
            })() : (
              <div style={{ color: '#2a2a4a', fontSize: 10 }}>Select TO</div>
            )}
          </div>
        </div>

        {/* Selectors */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#f97316', fontSize: 9, letterSpacing: 1, marginBottom: 5 }}>FROM (RUNNING)</div>
            <select value={fromPid} onChange={e => setFromPid(e.target.value)} style={{
              width: '100%', background: '#0d0d1a', border: '1px solid #1e1e3f',
              color: '#e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: 11, fontFamily: 'monospace',
            }}>
              <option value="">— select —</option>
              {runningProcs.map(p => (
                <option key={p.pid} value={p.pid}>#{p.pid} {p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#3b82f6', fontSize: 9, letterSpacing: 1, marginBottom: 5 }}>TO (READY)</div>
            <select value={toPid} onChange={e => setToPid(e.target.value)} style={{
              width: '100%', background: '#0d0d1a', border: '1px solid #1e1e3f',
              color: '#e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: 11, fontFamily: 'monospace',
            }}>
              <option value="">— select —</option>
              {readyProcs.filter(p => p.pid !== parseInt(fromPid)).map(p => (
                <option key={p.pid} value={p.pid}>#{p.pid} {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSwitch}
          disabled={!fromPid || !toPid || phase !== 'idle'}
          style={{
            background: fromPid && toPid && phase === 'idle' ? 'linear-gradient(90deg,#7c3aed,#6366f1)' : '#111120',
            border: `1px solid ${fromPid && toPid && phase === 'idle' ? '#7c3aed' : '#1e1e3f'}`,
            color: fromPid && toPid && phase === 'idle' ? '#fff' : '#2a2a4a',
            borderRadius: 8, padding: '9px',
            fontSize: 11, fontWeight: 700, cursor: fromPid && toPid && phase === 'idle' ? 'pointer' : 'not-allowed',
            letterSpacing: 1, fontFamily: 'monospace', transition: 'all 0.2s',
          }}
        >
          🔁 EXECUTE CONTEXT SWITCH
        </button>

        {/* Log */}
        {log.length > 0 && (
          <div ref={logRef} style={{
            background: '#06060e', border: '1px solid #111128',
            borderRadius: 8, padding: '10px 14px', maxHeight: 120,
            overflowY: 'auto', fontSize: 9, lineHeight: 1.8,
          }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: l.color, fontFamily: 'monospace' }}>
                {'>'} {l.msg}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
