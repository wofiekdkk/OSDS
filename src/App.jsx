import { useState, useEffect, useRef } from "react";

// ============================================
// DATA LAYER
// ============================================
const STATE_COLORS = {
  NEW:        { bg:'#f3e8ff', border:'#7c3aed', text:'#c4b5fd', glow:'#7c3aed' },
  READY:      { bg:'#dcfce7', border:'#16a34a', text:'#4ade80', glow:'#16a34a' },
  RUNNING:    { bg:'#fef3c7', border:'#f59e0b', text:'#fcd34d', glow:'#f59e0b' },
  WAITING:    { bg:'#dbeafe', border:'#3b82f6', text:'#93c5fd', glow:'#3b82f6' },
  TERMINATED: { bg:'#fee2e2', border:'#ef4444', text:'#fca5a5', glow:'#ef4444' },
  SUSPENDED:  { bg:'#fef3c7', border:'#a16207', text:'#fde68a', glow:'#a16207' },
};
const STATE_ICONS = { NEW:'🆕', READY:'⏳', RUNNING:'⚡', WAITING:'🔵', TERMINATED:'💀', SUSPENDED:'💤' };
const PRIORITY_LEVELS = {
  1:{label:'CRITICAL',color:'#ef4444'}, 2:{label:'HIGH',color:'#f97316'},
  3:{label:'MEDIUM',color:'#eab308'},   4:{label:'LOW',color:'#22c55e'},
  5:{label:'IDLE',color:'#6b7280'},
};
const VALID_TRANSITIONS = {
  NEW:['READY'],
  READY:['RUNNING'],
  RUNNING:['READY','WAITING','TERMINATED'],
  WAITING:['READY'],
  TERMINATED:[],
  SUSPENDED:['READY'],
};

let pidCounter = 1003;
const mkReg = () => `0x${Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0')}`;
const mkPC  = () => `0x${Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,'0')}`;

function createPCB({name,priority,burstTime,memoryStart,memoryEnd,parentPid=null}) {
  pidCounter++;
  return {
    pid:pidCounter, name, state:'NEW', priority:parseInt(priority),
    programCounter:mkPC(),
    memoryStart:parseInt(memoryStart), memoryEnd:parseInt(memoryEnd),
    burstTime:parseInt(burstTime), remainingTime:parseInt(burstTime),
    waitingTime:0, openFiles:[], registers:{AX:mkReg(),BX:mkReg(),CX:'0x0000',DX:mkReg()},
    createdAt:Date.now(), parentPid,
    arrivalTime: pidCounter - 1003,
  };
}

const INITIAL = [
  { pid:1001,name:'chrome.exe', state:'RUNNING',priority:2,programCounter:'0x00A4F2',memoryStart:100,memoryEnd:450,burstTime:8,remainingTime:3,waitingTime:2,openFiles:['index.html','styles.css'],registers:{AX:'0x001F',BX:'0x00A2',CX:'0x0000',DX:'0x0FF1'},createdAt:Date.now()-5000,parentPid:null,arrivalTime:1 },
  { pid:1002,name:'vscode.exe', state:'READY',  priority:3,programCounter:'0x00B1C3',memoryStart:451,memoryEnd:700,burstTime:5,remainingTime:5,waitingTime:1,openFiles:['main.c'],            registers:{AX:'0x0030',BX:'0x00B0',CX:'0x0001',DX:'0x0100'},createdAt:Date.now()-3000,parentPid:null,arrivalTime:2 },
  { pid:1003,name:'spotify.exe',state:'WAITING',priority:4,programCounter:'0x00C2D1',memoryStart:701,memoryEnd:850,burstTime:3,remainingTime:3,waitingTime:4,openFiles:['audio.mp3'],         registers:{AX:'0x0005',BX:'0x00C0',CX:'0x0010',DX:'0x0050'},createdAt:Date.now()-2000,parentPid:null,arrivalTime:3 },
];

// ─── HELPERS ────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));
const SC = s => STATE_COLORS[s] || STATE_COLORS.NEW;

// ─── MINI COMPONENTS ────────────────────────
function StateBadge({state,glow}) {
  const sc = SC(state);
  return (
    <span style={{background:sc.bg,border:`1px solid ${sc.border}`,color:sc.text,borderRadius:5,padding:'2px 8px',fontSize:9,fontWeight:700,letterSpacing:1,boxShadow:glow?`0 0 10px ${sc.glow}66`:'none'}}>
      {STATE_ICONS[state]} {state}
    </span>
  );
}

function SectionHead({label,color}) {
  return <div style={{color:color||'#6366f1',fontSize:9,letterSpacing:2,margin:'12px 0 8px',fontWeight:700}}>◆ {label}</div>;
}

function Field({label,value,accent}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 4px',borderBottom:'1px solid #f8fafc'}}>
      <span style={{color:'#475569',fontSize:11,letterSpacing:1,textTransform:'uppercase'}}>{label}</span>
      <span style={{color:accent||'#ffffff',fontSize:13,fontFamily:'monospace',fontWeight:700,textAlign:'right'}}>{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB 1 — PROCESS TABLE
// ════════════════════════════════════════════
function ProcessTable({processes,onSelect,selectedPid}) {
  const [sortKey,setSortKey] = useState('pid');
  const sorted = [...processes].sort((a,b)=>{
    if(sortKey==='pid') return a.pid-b.pid;
    if(sortKey==='priority') return a.priority-b.priority;
    if(sortKey==='state') return a.state.localeCompare(b.state);
    return 0;
  });
  const cols = '65px 140px 120px 60px 130px 110px 100px';
  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:16}}>🗂️</span>
          <span style={{color:'#a78bfa',fontWeight:700,fontSize:13,letterSpacing:2}}>PROCESS TABLE</span>
          <span style={{background:'#7c3aed22',border:'1px solid #7c3aed55',color:'#a78bfa',borderRadius:20,padding:'1px 10px',fontSize:10}}>{processes.length} processes</span>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['pid','priority','state'].map(k=>(
            <button key={k} onClick={()=>setSortKey(k)} style={{background:sortKey===k?'#7c3aed33':'transparent',border:`1px solid ${sortKey===k?'#7c3aed':'#64748b'}`,color:sortKey===k?'#a78bfa':'#555',borderRadius:6,padding:'2px 8px',fontSize:9,cursor:'pointer',letterSpacing:1}}>↕ {k}</button>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:cols,padding:'8px 20px',borderBottom:'1px solid #f1f5f9',background:'#eef2f7'}}>
        {['PID','PROCESS','STATE','PRI','MEMORY','BURST','PC'].map(h=>(
          <div key={h} style={{color:'#333',fontSize:9,letterSpacing:2,fontWeight:700}}>{h}</div>
        ))}
      </div>
      <div style={{maxHeight:340,overflowY:'auto'}}>
        {sorted.length===0&&<div style={{textAlign:'center',padding:36,color:'#64748b',fontSize:13}}>No processes. Create one →</div>}
        {sorted.map(p=>{
          const sc=SC(p.state); const isSel=selectedPid===p.pid; const isRun=p.state==='RUNNING';
          return (
            <div key={p.pid} onClick={()=>onSelect(p)}
              style={{display:'grid',gridTemplateColumns:cols,padding:'11px 20px',borderBottom:'1px solid #0d0d1e',cursor:'pointer',transition:'background 0.2s',background:isSel?sc.bg:'transparent',borderLeft:`3px solid ${isSel?sc.border:'transparent'}`}}
              onMouseEnter={e=>!isSel&&(e.currentTarget.style.background='#f8fafc')}
              onMouseLeave={e=>!isSel&&(e.currentTarget.style.background='transparent')}
            >
              <div style={{color:'#6366f1',fontSize:12,fontWeight:700}}>#{p.pid}</div>
              <div>
                <div style={{color:'#e2e8f0',fontSize:12}}>{p.name}</div>
                {p.parentPid&&<div style={{color:'#64748b',fontSize:9}}>child of #{p.parentPid}</div>}
              </div>
              <StateBadge state={p.state} glow={isRun}/>
              <div style={{color:PRIORITY_LEVELS[p.priority]?.color,fontSize:11,fontWeight:700}}>P{p.priority}</div>
              <div style={{color:'#94a3b8',fontSize:11}}>{p.memoryStart}–{p.memoryEnd}
                <span style={{color:'#64748b',marginLeft:3}}>({p.memoryEnd-p.memoryStart}KB)</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:3,justifyContent:'center'}}>
                <div style={{fontSize:9,color:'#64748b'}}>{p.remainingTime}/{p.burstTime}ms</div>
                <div style={{background:'#f1f5f9',borderRadius:3,height:3,width:70}}>
                  <div style={{background:sc.border,borderRadius:3,height:'100%',width:`${(p.remainingTime/p.burstTime)*100}%`,transition:'width 0.5s',boxShadow:`0 0 5px ${sc.glow}`}}/>
                </div>
              </div>
              <div style={{color:'#64748b',fontSize:9,fontFamily:'monospace'}}>{p.programCounter}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB 2 — STATE DIAGRAM
// ════════════════════════════════════════════
function StateDiagram({processes}) {
  const NODES = {
    NEW:{x:80,y:50},READY:{x:260,y:50},RUNNING:{x:440,y:50},
    WAITING:{x:440,y:185},TERMINATED:{x:260,y:185},
  };
  const ARROWS = [
    {from:'NEW',to:'READY',label:'admitted',cx:170,cy:36},
    {from:'READY',to:'RUNNING',label:'CPU assigned',cx:350,cy:36},
    {from:'RUNNING',to:'READY',label:'interrupt',cx:350,cy:65},
    {from:'RUNNING',to:'WAITING',label:'I/O wait',cx:455,cy:118},
    {from:'WAITING',to:'READY',label:'I/O done',cx:350,cy:175},
    {from:'RUNNING',to:'TERMINATED',label:'exit',cx:350,cy:130},
  ];
  const getPath=(f,t)=>{
    const fn=NODES[f],tn=NODES[t];
    const fx=fn.x+54,fy=fn.y+18,tx=tn.x+54,ty=tn.y+18;
    if(f==='RUNNING'&&t==='READY') return `M${fx},${fy} C${fx},${fy-40} ${tx},${ty-40} ${tx},${ty}`;
    if(f==='RUNNING'&&t==='TERMINATED') return `M${fx},${fy} C${fx+20},${fy+80} ${tx+20},${ty-40} ${tx},${ty}`;
    if(f==='WAITING'&&t==='READY') return `M${tn.x+108},${ty+18} C${fx-20},${fy+40} ${tx+20},${ty+40} ${tx+108},${ty}`;
    return `M${fx},${fy} L${tx},${ty}`;
  };
  const counts={};processes.forEach(p=>{counts[p.state]=(counts[p.state]||0)+1;});
  const active=new Set(processes.map(p=>p.state));
  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:16}}>🔄</span>
        <span style={{color:'#a78bfa',fontWeight:700,fontSize:13,letterSpacing:2}}>STATE LIFECYCLE DIAGRAM</span>
      </div>
      <div style={{padding:20,overflowX:'auto'}}>
        <svg width="600" height="250" style={{display:'block',margin:'0 auto'}}>
          <defs>
            {Object.entries(STATE_COLORS).map(([s,sc])=>(
              <marker key={s} id={`arr-${s}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={sc.border}/>
              </marker>
            ))}
            <marker id="arr-def" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#64748b"/>
            </marker>
          </defs>
          {ARROWS.map((a,i)=>{
            const isAct=active.has(a.from)&&active.has(a.to);
            const sc=SC(a.from);
            return (
              <g key={i}>
                <path d={getPath(a.from,a.to)} fill="none" stroke={isAct?sc.border:'#1a1a2e'} strokeWidth={isAct?1.5:1}
                  markerEnd={isAct?`url(#arr-${a.from})`:'url(#arr-def)'} strokeDasharray={isAct?'none':'4 4'} opacity={isAct?0.8:0.3}/>
                <text x={a.cx} y={a.cy} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">{a.label}</text>
              </g>
            );
          })}
          {Object.entries(NODES).map(([state,pos])=>{
            const sc=SC(state); const isAct=active.has(state); const cnt=counts[state]||0; const isRun=state==='RUNNING'&&isAct;
            return (
              <g key={state} transform={`translate(${pos.x},${pos.y})`}>
                {isAct&&<rect x="-4" y="-4" width="116" height="44" rx="10" fill="none" stroke={sc.border} strokeWidth="1" opacity="0.3"/>}
                <rect x="0" y="0" width="108" height="36" rx="8" fill={isAct?sc.bg:'#ffffff'} stroke={isAct?sc.border:'#1a1a2e'} strokeWidth={isAct?1.5:1}/>
                {isRun&&<rect x="-6" y="-6" width="120" height="48" rx="12" fill="none" stroke={sc.border} strokeWidth="1" opacity="0.5">
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="strokeWidth" values="1;3;1" dur="1.5s" repeatCount="indefinite"/>
                </rect>}
                <text x="54" y="14" textAnchor="middle" fill={isAct?sc.text:'#333'} fontSize="10" fontWeight="700" fontFamily="monospace">{STATE_ICONS[state]}</text>
                <text x="54" y="27" textAnchor="middle" fill={isAct?sc.text:'#64748b'} fontSize="9" fontWeight="700" fontFamily="monospace" letterSpacing="1">{state}</text>
                {cnt>0&&<g><circle cx="96" cy="0" r="9" fill={sc.border}/><text x="96" y="4" textAnchor="middle" fill="#000" fontSize="9" fontWeight="900">{cnt}</text></g>}
              </g>
            );
          })}
        </svg>
        <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:8,flexWrap:'wrap'}}>
          {Object.entries(STATE_COLORS).filter(([s])=>s!=='SUSPENDED').map(([s,sc])=>(
            <div key={s} style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:sc.border}}/>
              <span style={{color:'#64748b',fontSize:9,letterSpacing:1}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB 3 — QUEUES + MEMORY + SCHEDULERS
// ════════════════════════════════════════════
function QueueVisualizer({processes}) {
  const byState = s => processes.filter(p=>p.state===s).sort((a,b)=>a.priority-b.priority);
  const TOTAL=1200;
  const active=processes.filter(p=>p.state!=='TERMINATED');

  const usedMem = active.reduce((s,p)=>s+(p.memoryEnd-p.memoryStart),0);
  const degreeOfMP = active.length;

  function QueueLane({title,color,icon,procs,sub}) {
    return (
      <div>
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
          <span>{icon}</span>
          <span style={{color,fontSize:10,fontWeight:700,letterSpacing:1}}>{title}</span>
          <span style={{background:`${color}22`,border:`1px solid ${color}55`,color,borderRadius:12,padding:'1px 7px',fontSize:9}}>{procs.length}</span>
          {sub&&<span style={{color:'#64748b',fontSize:9}}>{sub}</span>}
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',minHeight:48,background:'#eef2f7',borderRadius:8,padding:10,border:`1px solid ${color}22`,alignItems:'center'}}>
          {procs.length===0&&<div style={{color:'#1a1a2e',fontSize:10}}>empty</div>}
          {procs.map((p,i)=>{
            const sc=SC(p.state);
            return (
              <div key={p.pid} style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:7,padding:'5px 10px'}}>
                  <div style={{color:sc.text,fontSize:10,fontWeight:700}}>#{p.pid}</div>
                  <div style={{color:'#64748b',fontSize:9}}>{p.name}</div>
                  <div style={{color:PRIORITY_LEVELS[p.priority]?.color,fontSize:8}}>P{p.priority}</div>
                </div>
                {i<procs.length-1&&<span style={{color:'#d8e1ee',fontSize:14}}>→</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',alignItems:'center',gap:10}}>
        <span>📊</span>
        <span style={{color:'#a78bfa',fontWeight:700,fontSize:13,letterSpacing:2}}>QUEUES, MEMORY & SCHEDULERS</span>
      </div>
      <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:16}}>

        {/* Degree of Multiprogramming */}
        <div style={{background:'#eef2f7',border:'1px solid #d8e1ee',borderRadius:10,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{color:'#a78bfa',fontSize:10,fontWeight:700,letterSpacing:1}}>DEGREE OF MULTIPROGRAMMING</div>
            <div style={{color:'#64748b',fontSize:9,marginTop:2}}>Number of processes currently in RAM</div>
          </div>
          <div style={{color:'#fcd34d',fontSize:32,fontWeight:900}}>{degreeOfMP}</div>
        </div>

        {/* 3 Scheduler Cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[
            {name:'LTS',full:'Long Term Scheduler',color:'#7c3aed',desc:'Controls Degree of Multiprogramming. Picks from Job Queue → loads into RAM.',icon:'📥'},
            {name:'STS',full:'Short Term Scheduler',color:'#f59e0b',desc:'CPU Scheduler. Picks from Ready Queue → dispatches to CPU. Runs every ~10ms.',icon:'⚡'},
            {name:'MTS',full:'Medium Term Scheduler',color:'#3b82f6',desc:'Handles Swapping. Moves processes RAM ↔ Disk to free up memory.',icon:'🔄'},
          ].map(sch=>(
            <div key={sch.name} style={{background:'#eef2f7',border:`1px solid ${sch.color}44`,borderRadius:10,padding:'12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                <span>{sch.icon}</span>
                <span style={{color:sch.color,fontWeight:700,fontSize:12}}>{sch.name}</span>
              </div>
              <div style={{color:'#a78bfa',fontSize:9,marginBottom:4}}>{sch.full}</div>
              <div style={{color:'#64748b',fontSize:9,lineHeight:1.5}}>{sch.desc}</div>
            </div>
          ))}
        </div>

        {/* Queues */}
        <QueueLane title="JOB QUEUE — NEW state (secondary memory)"   color="#7c3aed" icon="📥" procs={byState('NEW')}     sub="LTS picks from here"/>
        <QueueLane title="READY QUEUE — waiting for CPU (RAM)"        color="#16a34a" icon="⏳" procs={byState('READY')}   sub="STS picks from here"/>
        <QueueLane title="RUNNING — currently on CPU"                  color="#f59e0b" icon="⚡" procs={byState('RUNNING')} sub="max 1 on single core"/>
        <QueueLane title="WAITING/DEVICE QUEUE — blocked on I/O"      color="#3b82f6" icon="🔵" procs={byState('WAITING')} sub="moves to READY after I/O"/>
        <QueueLane title="SUSPENDED — swapped to disk by MTS"         color="#a16207" icon="💤" procs={byState('SUSPENDED')} sub="MTS swap-out"/>

        {/* Memory Map */}
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <span>🧠</span>
              <span style={{color:'#22d3ee',fontSize:10,fontWeight:700,letterSpacing:1}}>MEMORY MAP</span>
              <span style={{color:'#64748b',fontSize:9}}>({TOTAL} KB total)</span>
            </div>
            <span style={{color:'#4ade80',fontSize:10}}>{usedMem} KB used / {TOTAL-usedMem} KB free</span>
          </div>
          <div style={{background:'#eef2f7',borderRadius:8,padding:10,border:'1px solid #0f1f2a'}}>
            <div style={{height:32,borderRadius:6,overflow:'hidden',background:'#ffffff',position:'relative',border:'1px solid #f1f5f9',display:'flex'}}>
              {active.map(p=>{
                const sc=SC(p.state);
                const left=(p.memoryStart/TOTAL)*100;
                const width=((p.memoryEnd-p.memoryStart)/TOTAL)*100;
                return (
                  <div key={p.pid} title={`${p.name}: ${p.memoryStart}–${p.memoryEnd} KB`}
                    style={{position:'absolute',left:`${left}%`,width:`${width}%`,height:'100%',background:`${sc.border}55`,borderRight:`2px solid ${sc.border}`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',transition:'all 0.4s'}}>
                    <span style={{color:sc.text,fontSize:8,fontWeight:700,whiteSpace:'nowrap'}}>{width>5?`#${p.pid}`:''}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
              {[0,300,600,900,1200].map(v=><span key={v} style={{color:'#1e2a2a',fontSize:8}}>{v}KB</span>)}
            </div>
            <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
              {active.map(p=>{const sc=SC(p.state);return(
                <div key={p.pid} style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:8,height:8,borderRadius:2,background:sc.border}}/>
                  <span style={{color:'#64748b',fontSize:9}}>#{p.pid} {p.memoryStart}–{p.memoryEnd}KB</span>
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB 4 — CPU SCHEDULING ALGORITHMS
// ════════════════════════════════════════════
function CPUScheduling({processes}) {
  const [algo,setAlgo] = useState('FCFS');
  const candidates = processes.filter(p=>p.state==='READY'||p.state==='RUNNING');

  function schedule(list) {
    if(list.length===0) return [];
    const ps=[...list];
    if(algo==='FCFS') return ps.sort((a,b)=>a.arrivalTime-b.arrivalTime);
    if(algo==='SJF')  return ps.sort((a,b)=>a.burstTime-b.burstTime);
    if(algo==='PRIORITY') return ps.sort((a,b)=>a.priority-b.priority);
    if(algo==='RR')   return ps; // just show order
    return ps;
  }

  const scheduled = schedule(candidates);

  // Gantt chart data — simulate simple slots
  function buildGantt() {
    if(candidates.length===0) return [];
    const QUANTUM=3;
    let result=[];
    if(algo==='RR'){
      const q=[...candidates];
      let time=0;
      let rounds=0;
      while(q.length>0&&rounds<20){
        const p=q.shift();
        const run=Math.min(QUANTUM,p.remainingTime);
        result.push({pid:p.pid,name:p.name,start:time,end:time+run,color:SC(p.state).border});
        time+=run;
        if(p.remainingTime-run>0) q.push({...p,remainingTime:p.remainingTime-run});
        rounds++;
      }
    } else {
      let time=0;
      schedule([...candidates]).forEach(p=>{
        result.push({pid:p.pid,name:p.name,start:time,end:time+p.burstTime,color:SC(p.state).border});
        time+=p.burstTime;
      });
    }
    return result;
  }

  const gantt=buildGantt();
  const totalTime=gantt.length>0?gantt[gantt.length-1].end:0;

  const ALGOS=[
    {id:'FCFS',label:'FCFS',full:'First Come First Served',color:'#7c3aed',
     desc:'Process that arrives first gets CPU first. Simple, non-preemptive. May cause convoy effect.'},
    {id:'SJF', label:'SJF', full:'Shortest Job First',    color:'#22d3ee',
     desc:'Process with shortest burst time runs first. Minimum average waiting time. Non-preemptive.'},
    {id:'PRIORITY',label:'Priority',full:'Priority Scheduling',color:'#f97316',
     desc:'Highest priority PCB field wins the CPU. P1=Critical runs before P5=Idle. May cause starvation.'},
    {id:'RR',  label:'RR',  full:'Round Robin',           color:'#4ade80',
     desc:'Each process gets equal time quantum (3ms here). Fair, preemptive. Good for time-sharing.'},
  ];

  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',alignItems:'center',gap:10}}>
        <span>⚙️</span>
        <span style={{color:'#a78bfa',fontWeight:700,fontSize:13,letterSpacing:2}}>CPU SCHEDULING ALGORITHMS</span>
      </div>
      <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:16}}>

        {/* Algorithm selector */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
          {ALGOS.map(a=>(
            <button key={a.id} onClick={()=>setAlgo(a.id)} style={{background:algo===a.id?`${a.color}22`:'#eef2f7',border:`1px solid ${algo===a.id?a.color:'#d8e1ee'}`,borderRadius:10,padding:'10px 8px',cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
              <div style={{color:a.color,fontWeight:700,fontSize:13,marginBottom:3}}>{a.label}</div>
              <div style={{color:'#a78bfa',fontSize:9}}>{a.full}</div>
            </button>
          ))}
        </div>

        {/* Selected algo description */}
        {ALGOS.filter(a=>a.id===algo).map(a=>(
          <div key={a.id} style={{background:'#eef2f7',border:`1px solid ${a.color}44`,borderRadius:10,padding:'12px 16px'}}>
            <div style={{color:a.color,fontWeight:700,fontSize:12,marginBottom:6}}>{a.full}</div>
            <div style={{color:'#94a3b8',fontSize:11,lineHeight:1.6}}>{a.desc}</div>
          </div>
        ))}

        {/* Dispatcher info */}
        <div style={{background:'#eef2f7',border:'1px solid #f59e0b44',borderRadius:10,padding:'12px 16px'}}>
          <div style={{color:'#f59e0b',fontWeight:700,fontSize:11,marginBottom:4}}>⚡ DISPATCHER</div>
          <div style={{color:'#64748b',fontSize:10,lineHeight:1.6}}>
            The Dispatcher gives actual CPU control to the process selected by the Short Term Scheduler (STS).
            It handles: Context switch → switching to user mode → jumping to correct program counter location.
            <span style={{color:'#f97316'}}> Dispatch Latency</span> = time taken to stop one process and start another.
          </div>
        </div>

        {/* Execution order */}
        {scheduled.length>0&&(
          <div>
            <div style={{color:'#6366f1',fontSize:9,letterSpacing:2,marginBottom:8,fontWeight:700}}>◆ EXECUTION ORDER ({algo})</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {scheduled.map((p,i)=>{
                const sc=SC(p.state);
                return (
                  <div key={p.pid} style={{display:'flex',alignItems:'center',gap:12,background:'#eef2f7',borderRadius:8,padding:'8px 12px',border:`1px solid #d8e1ee`}}>
                    <div style={{color:'#64748b',fontSize:12,fontWeight:700,minWidth:20}}>#{i+1}</div>
                    <div style={{color:'#6366f1',fontSize:11,fontWeight:700,minWidth:50}}>#{p.pid}</div>
                    <div style={{color:'#e2e8f0',fontSize:11,minWidth:120}}>{p.name}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',gap:16,fontSize:10}}>
                        <span style={{color:'#64748b'}}>Burst: <span style={{color:sc.text}}>{p.burstTime}ms</span></span>
                        <span style={{color:'#64748b'}}>Priority: <span style={{color:PRIORITY_LEVELS[p.priority]?.color}}>P{p.priority}</span></span>
                        <span style={{color:'#64748b'}}>Arrival: <span style={{color:'#94a3b8'}}>{p.arrivalTime}</span></span>
                      </div>
                    </div>
                    {i===0&&<span style={{background:'#f59e0b22',border:'1px solid #f59e0b',color:'#fcd34d',borderRadius:5,padding:'2px 8px',fontSize:9,fontWeight:700}}>NEXT ON CPU</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gantt Chart */}
        {gantt.length>0&&(
          <div>
            <div style={{color:'#6366f1',fontSize:9,letterSpacing:2,marginBottom:8,fontWeight:700}}>◆ GANTT CHART</div>
            <div style={{background:'#eef2f7',borderRadius:10,padding:'12px',border:'1px solid #d8e1ee',overflowX:'auto'}}>
              <div style={{display:'flex',minWidth:'max-content',height:36,position:'relative'}}>
                {gantt.map((g,i)=>{
                  const w=Math.max(((g.end-g.start)/totalTime)*600,30);
                  return (
                    <div key={i} style={{width:w,height:'100%',background:`${g.color}33`,border:`1px solid ${g.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:g.color,fontWeight:700,overflow:'hidden',whiteSpace:'nowrap',padding:'0 4px'}}>
                      #{g.pid}
                    </div>
                  );
                })}
              </div>
              <div style={{display:'flex',minWidth:'max-content'}}>
                {gantt.map((g,i)=>{
                  const w=Math.max(((g.end-g.start)/totalTime)*600,30);
                  return (
                    <div key={i} style={{width:w,fontSize:8,color:'#64748b',textAlign:'center',paddingTop:3}}>{g.start}</div>
                  );
                })}
                <div style={{fontSize:8,color:'#64748b',paddingTop:3,paddingLeft:4}}>{totalTime}ms</div>
              </div>
            </div>
          </div>
        )}
        {candidates.length===0&&<div style={{textAlign:'center',padding:24,color:'#64748b',fontSize:12}}>No READY/RUNNING processes. Create some to see scheduling.</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB 5 — CONTEXT SWITCH
// ════════════════════════════════════════════
function ContextSwitch({processes,onContextSwitch}) {
  const [fromPid,setFromPid]=useState('');
  const [toPid,setToPid]=useState('');
  const [phase,setPhase]=useState('idle');
  const [log,setLog]=useState([]);
  const logRef=useRef(null);

  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);

  const running=processes.filter(p=>p.state==='RUNNING');
  const ready=processes.filter(p=>p.state==='READY');
  const addLog=(msg,color='#64748b')=>setLog(prev=>[...prev,{msg,color,id:Date.now()+Math.random()}]);

  const doSwitch=async()=>{
    if(!fromPid||!toPid) return;
    const from=processes.find(p=>p.pid===parseInt(fromPid));
    const to=processes.find(p=>p.pid===parseInt(toPid));
    if(!from||!to) return;
    setPhase('saving');
    addLog(`⚡ INTERRUPT — Timer fired! CPU time slice expired.`,'#f59e0b');
    await delay(700);
    addLog(`📌 Step 1: Save state of #${from.pid} (${from.name})`,'#f97316');
    addLog(`   PC saved: ${from.programCounter}`,'#64748b');
    addLog(`   Registers saved: AX=${from.registers.AX} BX=${from.registers.BX}`,'#64748b');
    addLog(`   State: RUNNING → READY`,'#4ade80');
    await delay(800);
    setPhase('dispatching');
    addLog(`🔍 Step 2: OS Scheduler selects #${to.pid} (${to.name}) from READY queue`,'#a78bfa');
    await delay(600);
    addLog(`⚙️ Step 3: DISPATCHER hands CPU to #${to.pid}`,'#f59e0b');
    await delay(600);
    setPhase('loading');
    addLog(`📂 Step 4: Load state of #${to.pid} from its PCB`,'#3b82f6');
    addLog(`   PC restored: ${to.programCounter}`,'#64748b');
    addLog(`   Registers restored: AX=${to.registers.AX} BX=${to.registers.BX}`,'#64748b');
    addLog(`   State: READY → RUNNING`,'#fcd34d');
    await delay(700);
    setPhase('done');
    addLog(`✅ Context Switch COMPLETE! #${to.pid} now executing on CPU.`,'#4ade80');
    addLog(`⚠️  NOTE: Context switch is pure OVERHEAD — no useful work done during switch!`,'#f97316');
    onContextSwitch(parseInt(fromPid),parseInt(toPid));
    setTimeout(()=>setPhase('idle'),1500);
  };

  const PhaseStep=({label,thisPhase,activePhase,color})=>(
    <div style={{padding:'7px 14px',borderRadius:8,background:activePhase===thisPhase?`${color}22`:'#ffffff',border:`1px solid ${activePhase===thisPhase?color:'#1a1a2e'}`,color:activePhase===thisPhase?color:'#64748b',fontSize:10,fontWeight:700,letterSpacing:1,transition:'all 0.3s',boxShadow:activePhase===thisPhase?`0 0 12px ${color}44`:'none'}}>
      {label}
    </div>
  );

  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',alignItems:'center',gap:10}}>
        <span>🔁</span>
        <span style={{color:'#a78bfa',fontWeight:700,fontSize:13,letterSpacing:2}}>CONTEXT SWITCH SIMULATOR</span>
      </div>
      <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:14}}>
        {/* Phase steps */}
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <PhaseStep label="1. INTERRUPT"   thisPhase="saving"      activePhase={phase} color="#f59e0b"/>
          <span style={{color:'#1a1a2e'}}>→</span>
          <PhaseStep label="2. SAVE PCB-A"  thisPhase="saving"      activePhase={phase} color="#f97316"/>
          <span style={{color:'#1a1a2e'}}>→</span>
          <PhaseStep label="3. DISPATCH"    thisPhase="dispatching"  activePhase={phase} color="#a78bfa"/>
          <span style={{color:'#1a1a2e'}}>→</span>
          <PhaseStep label="4. LOAD PCB-B"  thisPhase="loading"     activePhase={phase} color="#3b82f6"/>
          <span style={{color:'#1a1a2e'}}>→</span>
          <PhaseStep label="5. RESUME"      thisPhase="done"        activePhase={phase} color="#4ade80"/>
        </div>

        {/* Visual */}
        <div style={{background:'#ffffff',border:'1px solid #1a1a2e',borderRadius:10,padding:14,display:'flex',alignItems:'center',gap:12,justifyContent:'center'}}>
          <div style={{textAlign:'center',minWidth:100}}>
            <div style={{color:'#f97316',fontSize:9,letterSpacing:1,marginBottom:4}}>FROM (RUNNING)</div>
            {fromPid?(()=>{const p=processes.find(x=>x.pid===parseInt(fromPid));const sc=SC(p?.state||'RUNNING');return(<div style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:8,padding:'8px 12px',color:sc.text,fontSize:10,fontWeight:700}}><div>#{p?.pid}</div><div style={{color:'#64748b',marginTop:2}}>{p?.name}</div></div>);})():<div style={{color:'#64748b',fontSize:10}}>select process</div>}
          </div>
          <div style={{background:phase==='saving'?'#fef3c7':phase==='loading'?'#dbeafe':phase==='done'?'#dcfce7':'#111120',border:`2px solid ${phase==='saving'?'#f59e0b':phase==='loading'?'#3b82f6':phase==='done'?'#4ade80':'#d8e1ee'}`,borderRadius:12,padding:'12px 20px',textAlign:'center',transition:'all 0.4s',minWidth:90}}>
            <div style={{fontSize:20}}>🖥️</div>
            <div style={{color:'#a78bfa',fontSize:10,fontWeight:700,letterSpacing:1}}>CPU</div>
            <div style={{color:'#64748b',fontSize:8,marginTop:2}}>{phase==='saving'?'SAVING...':phase==='dispatching'?'DISPATCH...':phase==='loading'?'LOADING...':phase==='done'?'DONE!':'READY'}</div>
          </div>
          <div style={{color:'#d8e1ee',fontSize:20}}>⟷</div>
          <div style={{textAlign:'center',minWidth:100}}>
            <div style={{color:'#3b82f6',fontSize:9,letterSpacing:1,marginBottom:4}}>TO (READY)</div>
            {toPid?(()=>{const p=processes.find(x=>x.pid===parseInt(toPid));const sc=SC(p?.state||'READY');return(<div style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:8,padding:'8px 12px',color:sc.text,fontSize:10,fontWeight:700}}><div>#{p?.pid}</div><div style={{color:'#64748b',marginTop:2}}>{p?.name}</div></div>);})():<div style={{color:'#64748b',fontSize:10}}>select process</div>}
          </div>
        </div>

        {/* Selectors */}
        <div style={{display:'flex',gap:10}}>
          <div style={{flex:1}}>
            <div style={{color:'#f97316',fontSize:9,letterSpacing:1,marginBottom:5}}>FROM (RUNNING)</div>
            <select value={fromPid} onChange={e=>setFromPid(e.target.value)} style={{width:'100%',background:'#ffffff',border:'1px solid #d8e1ee',color:'#e2e8f0',borderRadius:6,padding:'7px 10px',fontSize:11,fontFamily:'monospace'}}>
              <option value="">— select —</option>
              {running.map(p=><option key={p.pid} value={p.pid}>#{p.pid} {p.name}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <div style={{color:'#3b82f6',fontSize:9,letterSpacing:1,marginBottom:5}}>TO (READY)</div>
            <select value={toPid} onChange={e=>setToPid(e.target.value)} style={{width:'100%',background:'#ffffff',border:'1px solid #d8e1ee',color:'#e2e8f0',borderRadius:6,padding:'7px 10px',fontSize:11,fontFamily:'monospace'}}>
              <option value="">— select —</option>
              {ready.filter(p=>p.pid!==parseInt(fromPid)).map(p=><option key={p.pid} value={p.pid}>#{p.pid} {p.name}</option>)}
            </select>
          </div>
        </div>

        <button onClick={doSwitch} disabled={!fromPid||!toPid||phase!=='idle'} style={{background:fromPid&&toPid&&phase==='idle'?'linear-gradient(90deg,#7c3aed,#6366f1)':'#111120',border:`1px solid ${fromPid&&toPid&&phase==='idle'?'#7c3aed':'#d8e1ee'}`,color:fromPid&&toPid&&phase==='idle'?'#fff':'#64748b',borderRadius:8,padding:'9px',fontSize:11,fontWeight:700,cursor:fromPid&&toPid&&phase==='idle'?'pointer':'not-allowed',letterSpacing:1,fontFamily:'monospace',transition:'all 0.2s'}}>
          🔁 EXECUTE CONTEXT SWITCH
        </button>

        <div ref={logRef} style={{background:'#eef2f7',border:'1px solid #f1f5f9',borderRadius:8,padding:'10px 14px',minHeight:60,maxHeight:180,overflowY:'auto',fontSize:10,lineHeight:1.8}}>
          {log.length===0?<div style={{color:'#1a1a2e'}}>Waiting for context switch...</div>:log.map(l=>(
            <div key={l.id} style={{color:l.color,fontFamily:'monospace'}}>{'>'} {l.msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB 6 — SPECIAL PROCESSES (Zombie/Orphan)
// ════════════════════════════════════════════
function SpecialProcesses({processes,onStateChange,onCreateChild,onReap}) {
  const zombies = processes.filter(p=>p.state==='TERMINATED'&&p.parentPid&&processes.find(pp=>pp.pid===p.parentPid));
  const orphans  = processes.filter(p=>p.state!=='TERMINATED'&&p.parentPid&&!processes.find(pp=>pp.pid===p.parentPid&&pp.state!=='TERMINATED'));
  const parents  = processes.filter(p=>p.state!=='TERMINATED');

  const [selParent,setSelParent]=useState('');

  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',alignItems:'center',gap:10}}>
        <span>👻</span>
        <span style={{color:'#a78bfa',fontWeight:700,fontSize:13,letterSpacing:2}}>ZOMBIE & ORPHAN PROCESSES</span>
      </div>
      <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:16}}>

        {/* Explain cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{background:'#eef2f7',border:'1px solid #ef444444',borderRadius:10,padding:'12px'}}>
            <div style={{color:'#fca5a5',fontWeight:700,fontSize:12,marginBottom:6}}>💀 ZOMBIE PROCESS</div>
            <div style={{color:'#64748b',fontSize:10,lineHeight:1.7}}>
              Child process has <span style={{color:'#fca5a5'}}>finished execution</span> but its PCB entry still exists because the parent has not yet called <span style={{color:'#fcd34d'}}>wait()</span> to read its exit status.<br/><br/>
              <span style={{color:'#64748b'}}>Fix: Parent calls wait() → reaps zombie → PCB deleted.</span>
            </div>
          </div>
          <div style={{background:'#eef2f7',border:'1px solid #f9731644',borderRadius:10,padding:'12px'}}>
            <div style={{color:'#fdba74',fontWeight:700,fontSize:12,marginBottom:6}}>👶 ORPHAN PROCESS</div>
            <div style={{color:'#64748b',fontSize:10,lineHeight:1.7}}>
              Child process is <span style={{color:'#fdba74'}}>still running</span> but its parent has been terminated.<br/><br/>
              <span style={{color:'#4ade80'}}>OS Fix: Init process (PID=1) automatically adopts all orphans and becomes their new parent.</span>
            </div>
          </div>
        </div>

        {/* Init Process */}
        <div style={{background:'#eef2f7',border:'1px solid #7c3aed44',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'#7c3aed33',border:'1px solid #7c3aed',borderRadius:8,padding:'8px 14px',textAlign:'center'}}>
            <div style={{color:'#a78bfa',fontWeight:700,fontSize:14}}>PID 1</div>
            <div style={{color:'#7c3aed',fontSize:9}}>init</div>
          </div>
          <div>
            <div style={{color:'#a78bfa',fontWeight:700,fontSize:11}}>Init Process — First process created by OS</div>
            <div style={{color:'#64748b',fontSize:10,marginTop:3}}>Adopts all orphan processes. Always running. Never terminates. Parent of all parentless processes.</div>
          </div>
        </div>

        {/* Create child process */}
        <div style={{background:'#eef2f7',border:'1px solid #d8e1ee',borderRadius:10,padding:'12px'}}>
          <div style={{color:'#6366f1',fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>◆ CREATE CHILD PROCESS (fork simulation)</div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <select value={selParent} onChange={e=>setSelParent(e.target.value)} style={{flex:1,background:'#ffffff',border:'1px solid #d8e1ee',color:'#e2e8f0',borderRadius:6,padding:'7px 10px',fontSize:11,fontFamily:'monospace'}}>
              <option value="">— select parent process —</option>
              {parents.map(p=><option key={p.pid} value={p.pid}>#{p.pid} {p.name}</option>)}
            </select>
            <button onClick={()=>{if(selParent)onCreateChild(parseInt(selParent));}} disabled={!selParent}
              style={{background:selParent?'#7c3aed22':'transparent',border:`1px solid ${selParent?'#7c3aed':'#d8e1ee'}`,color:selParent?'#a78bfa':'#64748b',borderRadius:8,padding:'7px 16px',fontSize:11,cursor:selParent?'pointer':'not-allowed',fontFamily:'monospace',fontWeight:700}}>
              🍴 FORK CHILD
            </button>
          </div>
        </div>

        {/* Zombie list */}
        <div>
          <div style={{color:'#fca5a5',fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>💀 ZOMBIE PROCESSES ({zombies.length})</div>
          {zombies.length===0?<div style={{color:'#1a1a2e',fontSize:10,padding:'8px 0'}}>No zombie processes currently.</div>:
            zombies.map(z=>(
              <div key={z.pid} style={{display:'flex',alignItems:'center',gap:10,background:'#fee2e2',border:'1px solid #ef444444',borderRadius:8,padding:'8px 12px',marginBottom:6}}>
                <span style={{color:'#fca5a5',fontWeight:700,fontSize:12}}>#{z.pid} {z.name}</span>
                <span style={{color:'#64748b',fontSize:10}}>parent: #{z.parentPid}</span>
                <span style={{flex:1}}/>
                <button onClick={()=>onReap(z.pid)} style={{background:'#ef444422',border:'1px solid #ef4444',color:'#fca5a5',borderRadius:6,padding:'4px 12px',fontSize:10,cursor:'pointer',fontFamily:'monospace'}}>
                  📞 CALL wait() — REAP
                </button>
              </div>
            ))
          }
        </div>

        {/* Orphan list */}
        <div>
          <div style={{color:'#fdba74',fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>👶 ORPHAN PROCESSES ({orphans.length})</div>
          {orphans.length===0?<div style={{color:'#1a1a2e',fontSize:10,padding:'8px 0'}}>No orphan processes currently.</div>:
            orphans.map(o=>(
              <div key={o.pid} style={{display:'flex',alignItems:'center',gap:10,background:'#fef3c7',border:'1px solid #f9731644',borderRadius:8,padding:'8px 12px',marginBottom:6}}>
                <span style={{color:'#fdba74',fontWeight:700,fontSize:12}}>#{o.pid} {o.name}</span>
                <span style={{color:'#4ade80',fontSize:10}}>→ adopted by Init (PID 1)</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB 7 — SWAPPING (MTS)
// ════════════════════════════════════════════
function SwappingTab({processes,onSwapOut,onSwapIn}) {
  const inRAM    = processes.filter(p=>p.state!=='TERMINATED'&&p.state!=='SUSPENDED');
  const onDisk   = processes.filter(p=>p.state==='SUSPENDED');
  const TOTAL=1200;
  const usedMem  = inRAM.reduce((s,p)=>s+(p.memoryEnd-p.memoryStart),0);
  const freeMem  = TOTAL-usedMem;

  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',alignItems:'center',gap:10}}>
        <span>💾</span>
        <span style={{color:'#a78bfa',fontWeight:700,fontSize:13,letterSpacing:2}}>SWAPPING — MEDIUM TERM SCHEDULER</span>
      </div>
      <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:16}}>

        {/* Concept */}
        <div style={{background:'#eef2f7',border:'1px solid #3b82f644',borderRadius:10,padding:'12px 16px'}}>
          <div style={{color:'#93c5fd',fontWeight:700,fontSize:11,marginBottom:6}}>What is Swapping?</div>
          <div style={{color:'#64748b',fontSize:10,lineHeight:1.7}}>
            When RAM is full, the MTS temporarily moves a <span style={{color:'#fcd34d'}}>WAITING</span> process from RAM to Hard Disk (Swap-Out).
            When needed again, it is brought back to RAM (Swap-In) and resumes from exactly where it stopped.
            This frees RAM for other processes and reduces the degree of multiprogramming.
          </div>
        </div>

        {/* Memory status */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[
            {label:'RAM USED',    val:`${usedMem} KB`,  color:'#f59e0b'},
            {label:'RAM FREE',    val:`${freeMem} KB`,  color:'#4ade80'},
            {label:'ON DISK',     val:`${onDisk.length} processes`, color:'#3b82f6'},
          ].map(s=>(
            <div key={s.label} style={{background:'#eef2f7',border:'1px solid #d8e1ee',borderRadius:10,padding:'12px',textAlign:'center'}}>
              <div style={{color:s.color,fontSize:20,fontWeight:900}}>{s.val}</div>
              <div style={{color:'#64748b',fontSize:9,marginTop:4,letterSpacing:1}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Processes in RAM — can swap out */}
        <div>
          <div style={{color:'#6366f1',fontSize:9,fontWeight:700,letterSpacing:2,marginBottom:8}}>◆ IN RAM — SWAP OUT (move to disk)</div>
          {inRAM.filter(p=>p.state==='WAITING').length===0&&<div style={{color:'#1a1a2e',fontSize:10,padding:'8px 0'}}>No WAITING processes to swap out.</div>}
          {inRAM.filter(p=>p.state==='WAITING').map(p=>{
            const sc=SC(p.state);
            return (
              <div key={p.pid} style={{display:'flex',alignItems:'center',gap:10,background:'#eef2f7',border:'1px solid #d8e1ee',borderRadius:8,padding:'8px 12px',marginBottom:6}}>
                <span style={{color:sc.text,fontWeight:700,fontSize:12}}>#{p.pid} {p.name}</span>
                <StateBadge state={p.state}/>
                <span style={{color:'#64748b',fontSize:10}}>{p.memoryEnd-p.memoryStart}KB in RAM</span>
                <span style={{flex:1}}/>
                <button onClick={()=>onSwapOut(p.pid)} style={{background:'#fef3c7',border:'1px solid #a16207',color:'#fde68a',borderRadius:6,padding:'4px 12px',fontSize:10,cursor:'pointer',fontFamily:'monospace'}}>
                  💾 SWAP OUT →
                </button>
              </div>
            );
          })}
        </div>

        {/* Processes on disk — can swap in */}
        <div>
          <div style={{color:'#a16207',fontSize:9,fontWeight:700,letterSpacing:2,marginBottom:8}}>◆ ON DISK (SUSPENDED) — SWAP IN (bring to RAM)</div>
          {onDisk.length===0&&<div style={{color:'#1a1a2e',fontSize:10,padding:'8px 0'}}>No suspended processes on disk.</div>}
          {onDisk.map(p=>(
            <div key={p.pid} style={{display:'flex',alignItems:'center',gap:10,background:'#fef3c7',border:'1px solid #a1620744',borderRadius:8,padding:'8px 12px',marginBottom:6}}>
              <span style={{color:'#fde68a',fontWeight:700,fontSize:12}}>#{p.pid} {p.name}</span>
              <StateBadge state={p.state}/>
              <span style={{color:'#64748b',fontSize:10}}>on hard disk</span>
              <span style={{flex:1}}/>
              <button onClick={()=>onSwapIn(p.pid)} style={{background:'#dcfce7',border:'1px solid #16a34a',color:'#4ade80',borderRadius:6,padding:'4px 12px',fontSize:10,cursor:'pointer',fontFamily:'monospace'}}>
                ← SWAP IN
              </button>
            </div>
          ))}
        </div>

        {/* Visual diagram */}
        <div style={{background:'#eef2f7',border:'1px solid #d8e1ee',borderRadius:10,padding:'16px'}}>
          <div style={{color:'#6366f1',fontSize:9,fontWeight:700,letterSpacing:2,marginBottom:12}}>◆ SWAP DIAGRAM</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}>
            <div style={{background:'#dbeafe',border:'2px solid #3b82f6',borderRadius:10,padding:'16px 24px',textAlign:'center',minWidth:120}}>
              <div style={{fontSize:24}}>🧠</div>
              <div style={{color:'#3b82f6',fontWeight:700,fontSize:12}}>RAM</div>
              <div style={{color:'#64748b',fontSize:10}}>{inRAM.length} processes</div>
              <div style={{color:'#64748b',fontSize:9}}>{usedMem}/{TOTAL} KB</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'center'}}>
              <div style={{color:'#fde68a',fontSize:11,background:'#fef3c7',border:'1px solid #a16207',borderRadius:6,padding:'4px 10px'}}>→ Swap Out</div>
              <div style={{color:'#4ade80',fontSize:11,background:'#dcfce7',border:'1px solid #16a34a',borderRadius:6,padding:'4px 10px'}}>← Swap In</div>
            </div>
            <div style={{background:'#fef3c7',border:'2px solid #a16207',borderRadius:10,padding:'16px 24px',textAlign:'center',minWidth:120}}>
              <div style={{fontSize:24}}>💾</div>
              <div style={{color:'#fde68a',fontWeight:700,fontSize:12}}>HARD DISK</div>
              <div style={{color:'#64748b',fontSize:10}}>{onDisk.length} suspended</div>
              <div style={{color:'#64748b',fontSize:9}}>secondary storage</div>
            </div>
          </div>
          <div style={{textAlign:'center',marginTop:12,color:'#64748b',fontSize:10}}>
            MTS (Medium Term Scheduler) controls swap-out and swap-in operations
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// PCB INSPECTOR (Right Panel)
// ════════════════════════════════════════════
function PCBDetail({process,onStateChange,onTerminate}) {
  if(!process) return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,padding:32,textAlign:'center',fontFamily:'"Courier New",monospace',color:'#64748b',minHeight:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <div style={{fontSize:36}}>🖱️</div>
      <div style={{fontSize:12}}>Click any process to inspect its PCB</div>
    </div>
  );
  const sc=SC(process.state);
  const transitions=VALID_TRANSITIONS[process.state]||[];
  return (
    <div style={{background:'#ffffff',border:`1px solid ${sc.border}44`,borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace',boxShadow:`0 0 20px ${sc.glow}22`}}>
      <div style={{padding:'14px 18px',background:`linear-gradient(90deg,${sc.bg},#ffffff)`,borderBottom:`1px solid ${sc.border}44`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{color:sc.text,fontWeight:700,fontSize:14}}>📋 PCB #{process.pid}</div>
          <div style={{color:'#cbd5e1',fontSize:12,marginTop:2}}>{process.name}</div>
        </div>
        <StateBadge state={process.state} glow/>
      </div>
      <div style={{padding:'14px 18px'}}>
        <SectionHead label="CORE INFO" color="#818cf8"/>
        <Field label="Process ID"      value={`#${process.pid}`}       accent="#6366f1"/>
        <Field label="Priority"        value={`P${process.priority} — ${PRIORITY_LEVELS[process.priority]?.label}`} accent={PRIORITY_LEVELS[process.priority]?.color}/>
        <Field label="Program Counter" value={process.programCounter}  accent="#22d3ee"/>
        {process.parentPid&&<Field label="Parent PID" value={`#${process.parentPid}`} accent="#f97316"/>}

        <SectionHead label="MEMORY" color="#818cf8"/>
        <Field label="Range"     value={`${process.memoryStart} – ${process.memoryEnd} KB`}/>
        <Field label="Allocated" value={`${process.memoryEnd-process.memoryStart} KB`} accent="#4ade80"/>

        <SectionHead label="CPU REGISTERS" color="#818cf8"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
          {Object.entries(process.registers).map(([reg,val])=>(
            <div key={reg} style={{background:'#f8fafc',borderRadius:6,padding:'6px 10px',display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#a78bfa',fontSize:12,fontWeight:700}}>{reg}</span>
              <span style={{color:'#e2e8f0',fontSize:12}}>{val}</span>
            </div>
          ))}
        </div>

        <SectionHead label="TIMING" color="#818cf8"/>
        <Field label="Burst Time"   value={`${process.burstTime} ms`}/>
        <Field label="Remaining"    value={`${process.remainingTime} ms`} accent={sc.text}/>
        <Field label="Waiting Time" value={`${process.waitingTime} ms`}/>

        {process.openFiles.length>0&&<>
          <SectionHead label="OPEN FILES" color="#818cf8"/>
          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
            {process.openFiles.map(f=><span key={f} style={{background:'#f1f5f9',border:'1px solid #d8e1ee',color:'#94a3b8',borderRadius:5,padding:'2px 8px',fontSize:9}}>📄 {f}</span>)}
          </div>
        </>}

        {transitions.length>0&&<>
          <SectionHead label="TRANSITION TO" color="#818cf8"/>
          <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:8}}>
            {transitions.map(ns=>{const nc=SC(ns);return(
              <button key={ns} onClick={()=>onStateChange(process.pid,ns)}
                style={{background:nc.bg,border:`1px solid ${nc.border}`,color:nc.text,borderRadius:8,padding:'6px 14px',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'monospace'}}>
                → {STATE_ICONS[ns]} {ns}
              </button>
            );})}
          </div>
        </>}

        {process.state!=='TERMINATED'&&(
          <button onClick={()=>onTerminate(process.pid)} style={{width:'100%',background:'#fee2e2',border:'1px solid #ef444466',color:'#fca5a5',borderRadius:8,padding:'8px',fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:1,fontFamily:'monospace'}}>
            💀 TERMINATE PROCESS
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// CREATE PROCESS FORM
// ════════════════════════════════════════════
function CreateProcess({onCreateProcess,processes}) {
  const [form,setForm]=useState({name:'',priority:'3',burstTime:'5',memoryStart:'',memoryEnd:''});
  const [err,setErr]=useState('');
  const change=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=()=>{
    if(!form.name||!form.memoryStart||!form.memoryEnd){setErr('Fill all fields!');return;}
    const ms=parseInt(form.memoryStart),me=parseInt(form.memoryEnd);
    if(ms>=me){setErr('End must be > Start');return;}
    const overlap=processes.filter(p=>p.state!=='TERMINATED').find(p=>!(me<=p.memoryStart||ms>=p.memoryEnd));
    if(overlap){setErr(`Overlaps with #${overlap.pid} (${overlap.memoryStart}–${overlap.memoryEnd}KB)`);return;}
    onCreateProcess(form);setForm({name:'',priority:'3',burstTime:'5',memoryStart:'',memoryEnd:''});setErr('');
  };
  return (
    <div style={{background:'#ffffff',border:'1px solid #d8e1ee',borderRadius:16,overflow:'hidden',fontFamily:'"Courier New",monospace'}}>
      <div style={{padding:'12px 18px',background:'linear-gradient(90deg,#f1f5f9,#f5f3ff)',borderBottom:'1px solid #d8e1ee',display:'flex',alignItems:'center',gap:8}}>
        <span>🆕</span>
        <span style={{color:'#a78bfa',fontWeight:700,fontSize:12,letterSpacing:2}}>CREATE PROCESS</span>
      </div>
      <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:10}}>
        {[
          {k:'name',label:'PROCESS NAME',ph:'notepad.exe',type:'text'},
          {k:'burstTime',label:'BURST TIME (ms)',ph:'5',type:'number'},
          {k:'memoryStart',label:'MEM START (KB)',ph:'870',type:'number'},
          {k:'memoryEnd',label:'MEM END (KB)',ph:'1000',type:'number'},
        ].map(f=>(
          <div key={f.k}>
            <div style={{color:'#475569',fontSize:9,letterSpacing:1,marginBottom:4}}>{f.label}</div>
            <input value={form[f.k]} onChange={e=>change(f.k,e.target.value)} placeholder={f.ph} type={f.type}
              style={{width:'100%',background:'#ffffff',border:'1px solid #d8e1ee',color:'#e2e8f0',borderRadius:6,padding:'7px 10px',fontSize:11,fontFamily:'monospace',boxSizing:'border-box'}}/>
          </div>
        ))}
        <div>
          <div style={{color:'#475569',fontSize:9,letterSpacing:1,marginBottom:4}}>PRIORITY</div>
          <select value={form.priority} onChange={e=>change('priority',e.target.value)} style={{width:'100%',background:'#ffffff',border:'1px solid #d8e1ee',color:'#e2e8f0',borderRadius:6,padding:'7px 10px',fontSize:11,fontFamily:'monospace'}}>
            {Object.entries(PRIORITY_LEVELS).map(([k,v])=><option key={k} value={k}>P{k} — {v.label}</option>)}
          </select>
        </div>
        {err&&<div style={{color:'#fca5a5',fontSize:10,background:'#fee2e2',border:'1px solid #ef444444',borderRadius:6,padding:'6px 10px'}}>{err}</div>}
        <button onClick={submit} style={{background:'linear-gradient(90deg,#7c3aed,#6366f1)',border:'none',color:'#fff',borderRadius:8,padding:'9px',fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:1,fontFamily:'monospace'}}>
          🚀 SPAWN PROCESS
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════
export default function App() {
  const [processes,setProcesses] = useState(INITIAL);
  const [selectedPid,setSelectedPid] = useState(null);
  const [activeTab,setActiveTab] = useState('table');
  const [notifications,setNotifications] = useState([]);

  const notify=(msg,color='#4ade80')=>{
    const id=Date.now()+Math.random();
    setNotifications(n=>[...n,{id,msg,color}]);
    setTimeout(()=>setNotifications(n=>n.filter(x=>x.id!==id)),3500);
  };

  const handleCreate=(form)=>{
    const pcb=createPCB(form);
    setProcesses(p=>[...p,pcb]);
    notify(`🆕 Process #${pcb.pid} (${pcb.name}) created!`,'#a78bfa');
  };

  const handleStateChange=(pid,newState)=>{
    setProcesses(ps=>ps.map(p=>{
      if(p.pid!==pid) return p;
      if(!(VALID_TRANSITIONS[p.state]||[]).includes(newState)) return p;
      return {...p,state:newState};
    }));
    notify(`⚡ #${pid} → ${newState}`,'#fcd34d');
  };

  const handleTerminate=(pid)=>{
    setProcesses(ps=>ps.map(p=>p.pid===pid?{...p,state:'TERMINATED'}:p));
    setSelectedPid(null);
    notify(`💀 Process #${pid} terminated`,'#fca5a5');
  };

  const handleContextSwitch=(fromPid,toPid)=>{
    setProcesses(ps=>ps.map(p=>{
      if(p.pid===fromPid) return {...p,state:'READY'};
      if(p.pid===toPid)   return {...p,state:'RUNNING'};
      return p;
    }));
    notify(`🔁 Context switch: #${fromPid} ↔ #${toPid}`,'#93c5fd');
  };

  const handleCreateChild=(parentPid)=>{
    const parent=processes.find(p=>p.pid===parentPid);
    if(!parent) return;
    const child=createPCB({name:`child_of_${parent.name}`,priority:parent.priority,burstTime:3,memoryStart:900,memoryEnd:950,parentPid});
    setProcesses(p=>[...p,child]);
    notify(`🍴 Forked child #${child.pid} from parent #${parentPid}`,'#fdba74');
  };

  const handleReap=(pid)=>{
    setProcesses(ps=>ps.filter(p=>p.pid!==pid));
    notify(`📞 wait() called — Zombie #${pid} reaped from process table`,'#4ade80');
  };

  const handleSwapOut=(pid)=>{
    setProcesses(ps=>ps.map(p=>p.pid===pid?{...p,state:'SUSPENDED'}:p));
    notify(`💾 Process #${pid} swapped OUT to disk`,'#fde68a');
  };

  const handleSwapIn=(pid)=>{
    setProcesses(ps=>ps.map(p=>p.pid===pid?{...p,state:'READY'}:p));
    notify(`🔄 Process #${pid} swapped IN to RAM`,'#4ade80');
  };

  const selected=processes.find(p=>p.pid===selectedPid)||null;

  const TABS=[
    {id:'table',   label:'🗂️ Table',    },
    {id:'diagram', label:'🔄 States',   },
    {id:'queues',  label:'📊 Queues',   },
    {id:'schedule',label:'⚙️ Scheduling'},
    {id:'context', label:'🔁 Switch',   },
    {id:'special', label:'👻 Zombie/Orphan'},
    {id:'swap',    label:'💾 Swapping', },
  ];

  const statCounts={NEW:0,READY:0,RUNNING:0,WAITING:0,TERMINATED:0,SUSPENDED:0};
  processes.forEach(p=>{ if(statCounts[p.state]!==undefined) statCounts[p.state]++; });
  const statColors={NEW:'#7c3aed',READY:'#16a34a',RUNNING:'#f59e0b',WAITING:'#3b82f6',TERMINATED:'#ef4444',SUSPENDED:'#a16207'};

  return (
    <div style={{minHeight:'100vh',background:'#f4f7fb',color:'#e2e8f0',fontFamily:'"Courier New",monospace',padding:0}}>
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)'}}/>

      {/* Header */}
      <div style={{background:'linear-gradient(90deg,#ffffff,#f1f5f9,#ffffff)',borderBottom:'1px solid #d8e1ee',padding:'14px 24px',position:'sticky',top:0,zIndex:100,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:8,background:'linear-gradient(135deg,#7c3aed,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:'0 0 16px #7c3aed66'}}>🖥️</div>
          <div>
            <div style={{color:'#a78bfa',fontWeight:900,fontSize:15,letterSpacing:3}}>PCB MANAGEMENT SIMULATOR</div>
            <div style={{color:'#64748b',fontSize:9,letterSpacing:2,marginTop:1}}>OPERATING SYSTEM — PROCESS CONTROL BLOCK VISUALIZATION</div>
          </div>
        </div>
        <div className="pcb-stats" style={{display:'flex',gap:14}}>
          {Object.entries(statCounts).map(([state,count])=>(
            <div key={state} style={{textAlign:'center'}}>
              <div style={{color:statColors[state],fontSize:18,fontWeight:900}}>{count}</div>
              <div style={{color:'#d8e1ee',fontSize:7,letterSpacing:1}}>{state}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div style={{position:'fixed',top:78,right:20,zIndex:200,display:'flex',flexDirection:'column',gap:8}}>
        {notifications.map(n=>(
          <div key={n.id} style={{background:'#ffffff',border:`1px solid ${n.color}66`,color:n.color,borderRadius:8,padding:'8px 14px',fontSize:11,fontFamily:'monospace',boxShadow:`0 0 12px ${n.color}33`}}>{n.msg}</div>
        ))}
      </div>

      {/* Main */}
      <div className="pcb-content" style={{padding:'18px 24px',maxWidth:1440,margin:'0 auto',position:'relative',zIndex:1}}>
        <div className="pcb-main-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 420px',gap:20}}>

          {/* LEFT */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Tabs */}
            <div className="pcb-tabs" style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{background:activeTab===t.id?'#7c3aed22':'transparent',border:`1px solid ${activeTab===t.id?'#7c3aed':'#d8e1ee'}`,color:activeTab===t.id?'#a78bfa':'#64748b',borderRadius:8,padding:'7px 14px',fontSize:11,cursor:'pointer',fontFamily:'monospace',letterSpacing:1,fontWeight:activeTab===t.id?700:400,transition:'all 0.2s'}}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab==='table'    && <ProcessTable   processes={processes} onSelect={p=>setSelectedPid(p.pid===selectedPid?null:p.pid)} selectedPid={selectedPid}/>}
            {activeTab==='diagram'  && <StateDiagram   processes={processes}/>}
            {activeTab==='queues'   && <QueueVisualizer processes={processes}/>}
            {activeTab==='schedule' && <CPUScheduling   processes={processes}/>}
            {activeTab==='context'  && <ContextSwitch   processes={processes} onContextSwitch={handleContextSwitch}/>}
            {activeTab==='special'  && <SpecialProcesses processes={processes} onStateChange={handleStateChange} onCreateChild={handleCreateChild} onReap={handleReap}/>}
            {activeTab==='swap'     && <SwappingTab      processes={processes} onSwapOut={handleSwapOut} onSwapIn={handleSwapIn}/>}
          </div>

          {/* RIGHT */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <CreateProcess onCreateProcess={handleCreate} processes={processes}/>
            <PCBDetail process={selected} onStateChange={handleStateChange} onTerminate={handleTerminate}/>
          </div>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box;} body{margin:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#eef2f7;}
        ::-webkit-scrollbar-thumb{background:#d8e1ee;border-radius:2px;}
        select option{background:#ffffff;color:#0f172a;}
      `}</style>
    </div>
  );
}