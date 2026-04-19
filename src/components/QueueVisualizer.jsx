// ============================================
// QueueVisualizer.jsx — Ready Queue + Memory Map
// ============================================
import { STATE_COLORS, STATE_ICONS, PRIORITY_LEVELS } from "../data/pcbData";

function QueueLane({ title, color, icon, processes }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8,
      }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{title}</span>
        <span style={{
          background: `${color}22`, border: `1px solid ${color}55`,
          color, borderRadius: 12, padding: '1px 7px', fontSize: 9,
        }}>{processes.length}</span>
      </div>

      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 50,
        background: '#06060e', borderRadius: 8, padding: 10,
        border: `1px solid ${color}22`,
        alignItems: 'center',
      }}>
        {processes.length === 0 && (
          <div style={{ color: '#1a1a2e', fontSize: 10 }}>empty</div>
        )}
        {processes.map((p, i) => {
          const sc = STATE_COLORS[p.state];
          return (
            <div key={p.pid} style={{
              background: sc.bg,
              border: `1px solid ${sc.border}`,
              borderRadius: 7,
              padding: '6px 10px',
              animation: 'fadeIn 0.3s ease',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <div style={{ color: sc.text, fontSize: 10, fontWeight: 700 }}>
                #{p.pid}
              </div>
              <div style={{ color: '#475569', fontSize: 9 }}>{p.name}</div>
              <div style={{ color: PRIORITY_LEVELS[p.priority]?.color, fontSize: 8 }}>
                P{p.priority}
              </div>
              {i < processes.length - 1 && (
                <div style={{
                  position: 'absolute',
                  right: -12, top: '50%',
                  color: '#1a1a2e', fontSize: 12,
                }}>→</div>
              )}
            </div>
          );
        })}
        {processes.length > 0 && (
          <div style={{ color: '#1a1a2e', fontSize: 16, alignSelf: 'center' }}>←</div>
        )}
      </div>
    </div>
  );
}

function MemoryMap({ processes }) {
  const TOTAL_MEM = 1200;
  const usedBlocks = processes.filter(p => p.state !== 'TERMINATED');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 13 }}>🧠</span>
        <span style={{ color: '#22d3ee', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>MEMORY MAP</span>
        <span style={{ color: '#334155', fontSize: 9 }}>({TOTAL_MEM} KB total)</span>
      </div>

      <div style={{
        background: '#06060e', borderRadius: 8, padding: 10,
        border: '1px solid #0f1f2a',
      }}>
        {/* Memory bar */}
        <div style={{
          height: 28, borderRadius: 6, overflow: 'hidden',
          background: '#0d0d1a', position: 'relative', border: '1px solid #111128',
          display: 'flex',
        }}>
          {usedBlocks.map(p => {
            const sc = STATE_COLORS[p.state];
            const left  = (p.memoryStart / TOTAL_MEM) * 100;
            const width = ((p.memoryEnd - p.memoryStart) / TOTAL_MEM) * 100;
            return (
              <div key={p.pid}
                title={`${p.name}: ${p.memoryStart}–${p.memoryEnd} KB`}
                style={{
                  position: 'absolute',
                  left: `${left}%`, width: `${width}%`,
                  height: '100%',
                  background: `${sc.border}55`,
                  borderRight: `2px solid ${sc.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'all 0.4s',
                }}
              >
                <span style={{ color: sc.text, fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {width > 5 ? `#${p.pid}` : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scale */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {[0, 300, 600, 900, 1200].map(v => (
            <span key={v} style={{ color: '#1e2a2a', fontSize: 8 }}>{v}</span>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {usedBlocks.map(p => {
            const sc = STATE_COLORS[p.state];
            return (
              <div key={p.pid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: sc.border }} />
                <span style={{ color: '#334155', fontSize: 9 }}>
                  #{p.pid} {p.memoryStart}–{p.memoryEnd}KB
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function QueueVisualizer({ processes }) {
  const byState = state => processes.filter(p => p.state === state)
    .sort((a, b) => a.priority - b.priority);

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
        <span style={{ fontSize: 16 }}>📊</span>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>QUEUES & MEMORY</span>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <QueueLane
          title="READY QUEUE (waiting for CPU)"
          color="#16a34a" icon="⏳"
          processes={byState('READY')}
        />
        <QueueLane
          title="WAITING QUEUE (blocked on I/O)"
          color="#3b82f6" icon="🔵"
          processes={byState('WAITING')}
        />
        <MemoryMap processes={processes} />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
