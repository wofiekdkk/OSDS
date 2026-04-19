// ============================================
// StateDiagram.jsx — Animated State Lifecycle
// ============================================
import { STATE_COLORS, STATE_ICONS } from "../data/pcbData";

const NODES = {
  NEW:        { x: 90,  y: 50  },
  READY:      { x: 280, y: 50  },
  RUNNING:    { x: 470, y: 50  },
  WAITING:    { x: 470, y: 180 },
  TERMINATED: { x: 280, y: 180 },
};

const ARROWS = [
  { from: 'NEW',     to: 'READY',      label: 'admitted',       cx: 185, cy: 36  },
  { from: 'READY',   to: 'RUNNING',    label: 'CPU assigned',   cx: 375, cy: 36  },
  { from: 'RUNNING', to: 'READY',      label: 'interrupt',      cx: 375, cy: 64  },
  { from: 'RUNNING', to: 'WAITING',    label: 'I/O wait',       cx: 484, cy: 115 },
  { from: 'WAITING', to: 'READY',      label: 'I/O done',       cx: 375, cy: 170 },
  { from: 'RUNNING', to: 'TERMINATED', label: 'exit',           cx: 375, cy: 130 },
];

function getArrowPath(from, to) {
  const f = NODES[from], t = NODES[to];
  const fx = f.x + 54, fy = f.y + 18;
  const tx = t.x + 54, ty = t.y + 18;

  // Curve control points
  if (from === 'RUNNING' && to === 'READY') {
    return `M${fx},${fy} C${fx},${fy - 40} ${tx},${ty - 40} ${tx},${ty}`;
  }
  if (from === 'RUNNING' && to === 'TERMINATED') {
    return `M${fx},${fy} C${fx + 20},${fy + 80} ${tx + 20},${ty - 40} ${tx},${ty}`;
  }
  if (from === 'WAITING' && to === 'READY') {
    return `M${t.x + 108},${ty + 18} C${fx - 20},${fy + 40} ${tx + 20},${ty + 40} ${tx + 108},${ty}`;
  }
  return `M${fx},${fy} L${tx},${ty}`;
}

export default function StateDiagram({ processes }) {
  const stateCounts = {};
  processes.forEach(p => {
    stateCounts[p.state] = (stateCounts[p.state] || 0) + 1;
  });

  const activeStates = new Set(processes.map(p => p.state));

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
        <span style={{ fontSize: 16 }}>🔄</span>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>STATE LIFECYCLE DIAGRAM</span>
      </div>

      <div style={{ padding: '20px', overflowX: 'auto' }}>
        <svg width="600" height="240" style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            {Object.entries(STATE_COLORS).map(([state, sc]) => (
              <marker key={state} id={`arrow-${state}`} markerWidth="8" markerHeight="8"
                refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={sc.border} />
              </marker>
            ))}
            <marker id="arrow-default" markerWidth="8" markerHeight="8"
              refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#2a2a4a" />
            </marker>
            {Object.entries(STATE_COLORS).map(([state, sc]) => (
              <filter key={`glow-${state}`} id={`glow-${state}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Arrows */}
          {ARROWS.map((arrow, i) => {
            const isActive = activeStates.has(arrow.from) && activeStates.has(arrow.to);
            const sc = STATE_COLORS[arrow.from];
            const path = getArrowPath(arrow.from, arrow.to);
            return (
              <g key={i}>
                <path
                  d={path}
                  fill="none"
                  stroke={isActive ? sc.border : '#1a1a2e'}
                  strokeWidth={isActive ? 1.5 : 1}
                  markerEnd={isActive ? `url(#arrow-${arrow.from})` : 'url(#arrow-default)'}
                  strokeDasharray={isActive ? 'none' : '4 4'}
                  opacity={isActive ? 0.8 : 0.3}
                />
              </g>
            );
          })}

          {/* Arrow Labels */}
          {ARROWS.map((arrow, i) => (
            <text key={`lbl-${i}`} x={arrow.cx} y={arrow.cy}
              textAnchor="middle" fill="#2a2a4a" fontSize="8" fontFamily="monospace">
              {arrow.label}
            </text>
          ))}

          {/* State Nodes */}
          {Object.entries(NODES).map(([state, pos]) => {
            const sc = STATE_COLORS[state];
            const isActive = activeStates.has(state);
            const count = stateCounts[state] || 0;
            const isRunning = state === 'RUNNING' && isActive;

            return (
              <g key={state} transform={`translate(${pos.x}, ${pos.y})`}>
                {/* Glow ring for active */}
                {isActive && (
                  <rect x="-4" y="-4" width="116" height="44"
                    rx="10" ry="10"
                    fill="none"
                    stroke={sc.border}
                    strokeWidth="1"
                    opacity="0.3"
                    filter={`url(#glow-${state})`}
                  />
                )}
                {/* Main box */}
                <rect x="0" y="0" width="108" height="36"
                  rx="8" ry="8"
                  fill={isActive ? sc.bg : '#0d0d1a'}
                  stroke={isActive ? sc.border : '#1a1a2e'}
                  strokeWidth={isActive ? 1.5 : 1}
                />
                {/* Running pulse ring */}
                {isRunning && (
                  <rect x="-6" y="-6" width="120" height="48"
                    rx="12" ry="12"
                    fill="none"
                    stroke={sc.border}
                    strokeWidth="1"
                    opacity="0.5"
                  >
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="strokeWidth" values="1;3;1" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                )}
                {/* Icon + Name */}
                <text x="54" y="14" textAnchor="middle"
                  fill={isActive ? sc.text : '#333'}
                  fontSize="10" fontWeight="700" fontFamily="monospace" letterSpacing="1">
                  {STATE_ICONS[state]}
                </text>
                <text x="54" y="27" textAnchor="middle"
                  fill={isActive ? sc.text : '#2a2a4a'}
                  fontSize="9" fontWeight="700" fontFamily="monospace" letterSpacing="1">
                  {state}
                </text>
                {/* Count badge */}
                {count > 0 && (
                  <g>
                    <circle cx="96" cy="0" r="9" fill={sc.border} />
                    <text x="96" y="4" textAnchor="middle" fill="#000" fontSize="9" fontWeight="900">{count}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          {Object.entries(STATE_COLORS).map(([state, sc]) => (
            <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: sc.border }} />
              <span style={{ color: '#334155', fontSize: 9, letterSpacing: 1 }}>{state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
