import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

/* ── tiny icon components ─────────────────────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const SendIcon    = () => <Icon d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" />;
const UploadIcon  = () => <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const ReportIcon  = () => <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />;
const ChevronIcon = ({ open }) => <Icon d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />;
const BotIcon     = () => <Icon d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2zM6 8h12M8 8v12M16 8v12M5 20h14" size={18} />;
const ClockIcon   = () => <Icon d="M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2" size={13} />;

/* ── section colour map for analysis cards ───────────────────── */
const SECTION_STYLES = {
  'summary':            { cls: 'section-summary',    label: '📋 Summary',             color: 'var(--blue)' },
  'root cause':         { cls: 'section-rootcause',  label: '🔍 Root Cause',          color: 'var(--red)' },
  'impacted component': { cls: 'section-impact',     label: '⚠️ Impacted Components', color: 'var(--orange)' },
  'fix step':           { cls: 'section-fix',        label: '🔧 Fix Steps',           color: 'var(--green)' },
  'preventive':         { cls: 'section-preventive', label: '🛡️ Preventive Actions',  color: 'var(--purple)' },
};

function getSectionStyle(heading) {
  const lower = heading.toLowerCase();
  for (const [key, val] of Object.entries(SECTION_STYLES)) {
    if (lower.includes(key)) return val;
  }
  return { cls: 'section-default', label: heading, color: 'var(--cyan)' };
}

/* ── custom markdown components ─────────────────────────────── */
function AnalysisMarkdown({ content }) {
  const components = {
    h2: ({ children }) => {
      const text = String(children);
      const s = getSectionStyle(text);
      return (
        <div className={`analysis-section ${s.cls}`}>
          <h2 style={{ color: s.color }}>{s.label}</h2>
        </div>
      );
    },
    h3: ({ children }) => (
      <h3 style={{ fontSize:'.88rem', fontWeight:700, color:'var(--cyan)', margin:'.8em 0 .3em' }}>
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <div style={{ color:'var(--text-secondary)', fontSize:'.88rem', lineHeight:1.7, margin:'.3em 0' }}>
        {children}
      </div>
    ),
    li: ({ children }) => (
      <li style={{ color:'var(--text-secondary)', fontSize:'.88rem', margin:'.2em 0' }}>{children}</li>
    ),
    pre: ({ children }) => (
      <pre style={{ background:'#0a0f1a', border:'1px solid rgba(255,255,255,.08)',
                    borderRadius:10, padding:'12px 14px', overflowX:'auto', margin:'.6em 0' }}>
        {children}
      </pre>
    ),
    code: ({ inline, children }) => inline ? (
      <code style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'.78rem',
                     background:'rgba(255,255,255,.08)', padding:'2px 6px',
                     borderRadius:4, color:'var(--cyan)' }}>
        {children}
      </code>
    ) : (
      <code style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'.78rem', color:'#e2e8f0', whiteSpace:'pre', display:'block' }}>
        {children}
      </code>
    ),
    strong: ({ children }) => <strong style={{ color:'var(--text-primary)', fontWeight:600 }}>{children}</strong>,
    blockquote: ({ children }) => (
      <blockquote style={{ borderLeft:'3px solid var(--purple)', padding:'.5em 1em',
                           background:'rgba(168,85,247,.06)', borderRadius:'0 8px 8px 0',
                           color:'var(--text-secondary)', fontStyle:'italic', fontSize:'.88rem', margin:'.5em 0' }}>
        {children}
      </blockquote>
    ),
  };
  return (
    <div className="md-body">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}

/* ── Round card in history ────────────────────────────────────── */
function RoundCard({ item, index, expanded, onToggle, onDelete }) {
  const colors = ['var(--blue)', 'var(--purple)', 'var(--pink)', 'var(--cyan)', 'var(--green)', 'var(--orange)'];
  const color  = colors[index % colors.length];
  return (
    <div className="glass animate-in" style={{
      marginBottom: 10, overflow:'hidden',
      border: expanded ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.08)',
      transition: 'border-color .2s',
    }}>
      {/* div instead of button — avoids nested <button> inside <button> HTML error */}
      <div
        role="button" tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 14px', background:'transparent', border:'none', cursor:'pointer',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:26, height:26, borderRadius:'50%',
            background: `linear-gradient(135deg, ${color}, ${color}99)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'.72rem', fontWeight:800, color:'#fff', flexShrink:0,
          }}>
            {index + 1}
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:'.78rem', fontWeight:600, color:'var(--text-primary)' }}>
              Round {index + 1}
              {item.errorCode && (
                <span className="badge badge-red" style={{ marginLeft:6, fontSize:'.65rem' }}>
                  {item.errorCode.slice(0,20)}
                </span>
              )}
            </div>
            <div style={{ fontSize:'.7rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
              <ClockIcon /> {item.timestamp}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ color:'var(--text-muted)' }}><ChevronIcon open={expanded} /></span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Delete this round"
            style={{
              background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.2)',
              color:'#f87171', borderRadius:6, padding:'2px 6px',
              fontSize:'.7rem', cursor:'pointer', lineHeight:1.4,
              transition:'all .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,.28)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,.12)'}
          >✕</button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding:'0 14px 14px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginTop:10, maxHeight:280, overflowY:'auto', paddingRight:4 }}>
            <AnalysisMarkdown content={item.analysis} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function AnalysisPage({ analyses, setAnalyses, clearAnalyses }) {
  const [logContent,    setLogContent]    = useState('');
  const [errorCode,     setErrorCode]     = useState('');
  const [file,          setFile]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [latestResult,  setLatestResult]  = useState(null);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [expandedIdx,   setExpandedIdx]   = useState(null);
  const [confirmClear,  setConfirmClear]  = useState(false);
  const fileRef    = useRef();
  const resultRef  = useRef();
  const navigate   = useNavigate();

  useEffect(() => {
    if (latestResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  }, [latestResult]);

  const handleAnalyze = async () => {
    if (!logContent.trim() && !errorCode.trim() && !file) return;
    setLoading(true);
    setErrorMsg('');
    setLatestResult(null);

    try {
      const fd = new FormData();
      fd.append('logContent', logContent);
      fd.append('errorCode',  errorCode);
      if (file) fd.append('logFile', file);

      const { data } = await axios.post('/api/analyze', fd, { timeout: 120000 });
      const entry = { ...data, logContent, errorCode, timestamp: new Date().toLocaleTimeString() };
      setAnalyses(prev => [...prev, entry]);
      setLatestResult(entry);
      setLogContent('');
      setErrorCode('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? 'Request timed out. Check your connection and try again.'
        : (err.response?.data?.error || err.message || 'Analysis failed — is the backend running?');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const canAnalyze = !loading && (logContent.trim() || errorCode.trim() || file);

  const deleteRound = (idx) => {
    setAnalyses(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
    if (latestResult && analyses[idx]?.id === latestResult?.id) setLatestResult(null);
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearAnalyses();
      setLatestResult(null);
      setExpandedIdx(null);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <div className="analysis-page-layout" style={{ display:'flex', gap:24, alignItems:'flex-start' }}>

      {/* ── LEFT: Input + Result ─────────────────────────────── */}
      <div className="analysis-main-col" style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:20 }}>

        {/* Page title */}
        <div>
          <h1 style={{ fontSize:'1.7rem', fontWeight:900, marginBottom:6, lineHeight:1.2 }}>
            <span className="gradient-text">AI-Powered</span>{' '}
            <span style={{ color:'var(--text-primary)' }}>Root Cause Analysis</span>
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'.88rem' }}>
            Chat freely like ChatGPT, or paste logs and errors for structured RCA analysis. Ask any question, run multiple rounds, then generate a formal report.
          </p>
        </div>

        {/* Input card */}
        <div className="glass" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background:'var(--grad-main)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <BotIcon />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:'.95rem' }}>Ask Anything / Submit Log or Error</div>
              <div style={{ fontSize:'.72rem', color:'var(--text-muted)' }}>Chat like ChatGPT · or paste logs for RCA analysis · or both</div>
            </div>
          </div>

          <textarea
            className="input-field mono"
            rows={7}
            placeholder={"Ask anything — chat like ChatGPT, or paste logs/errors for RCA analysis.\n\nExamples:\n• \"Hello! What is a NullPointerException?\"\n• \"Explain Kubernetes pod crash loops\"\n• ERROR: Connection refused to db.prod:5432\n• java.lang.NullPointerException at line 42..."}
            value={logContent}
            onChange={e => setLogContent(e.target.value)}
            style={{ marginBottom:12 }}
          />

          <input
            className="input-field"
            type="text"
            placeholder="Error Code (optional) — e.g. ECONNREFUSED, ORA-00942, NullPointerException"
            value={errorCode}
            onChange={e => setErrorCode(e.target.value)}
            style={{ marginBottom:12 }}
          />

          {/* File upload row */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <input ref={fileRef} type="file" accept=".log,.txt,.json,.csv"
                   style={{ display:'none' }} id="log-file"
                   onChange={e => setFile(e.target.files[0])} />
            <label htmlFor="log-file">
              <span className="btn btn-ghost" style={{ cursor:'pointer' }}>
                <UploadIcon /> Upload Log File
              </span>
            </label>
            {file && (
              <div style={{
                display:'flex', alignItems:'center', gap:8,
                background:'rgba(79,142,247,.12)', border:'1px solid rgba(79,142,247,.25)',
                borderRadius:8, padding:'5px 12px', fontSize:'.8rem', color:'var(--blue)',
              }}>
                📎 {file.name}
                <button onClick={() => { setFile(null); if(fileRef.current) fileRef.current.value=''; }}
                        style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'0 0 0 4px', fontSize:'.85rem' }}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{
              background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)',
              borderRadius:10, padding:'10px 14px', marginBottom:12,
              color:'#f87171', fontSize:'.85rem',
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
            }}>
              <span>⚠️ {errorMsg}</span>
              <button
                onClick={handleAnalyze}
                style={{
                  background:'rgba(239,68,68,.25)', border:'1px solid rgba(239,68,68,.5)',
                  borderRadius:6, color:'#f87171', cursor:'pointer',
                  fontSize:'.78rem', padding:'3px 10px', whiteSpace:'nowrap', flexShrink:0,
                }}
              >
                ↩ Retry
              </button>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:'1rem' }}
            disabled={!canAnalyze}
            onClick={handleAnalyze}
          >
            {loading ? <><div className="spinner" />&nbsp; Analyzing with AI...</> : <><SendIcon /> Analyze</>}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="glass animate-in" style={{ padding:28, textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
              <div style={{
                width:48, height:48, borderRadius:12,
                background:'var(--grad-main)', display:'flex', alignItems:'center', justifyContent:'center',
                animation:'pulse-glow 1.5s ease-in-out infinite',
              }}>
                <BotIcon />
              </div>
            </div>
            <div style={{ fontWeight:700, marginBottom:4 }}>AI is thinking...</div>
            <div style={{ fontSize:'.83rem', color:'var(--text-muted)' }}>
              Generating your response — logs get RCA analysis, questions get a smart answer
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:14 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:7, height:7, borderRadius:'50%',
                  background:'var(--blue)',
                  animation:`pulse-glow 1.2s ease-in-out ${i*0.25}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* AI result */}
        {latestResult && !loading && (
          <div ref={resultRef} className="glass animate-in" style={{
            padding:24,
            borderColor:'rgba(79,142,247,0.3)',
            boxShadow:'0 0 32px rgba(79,142,247,0.1)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16,
                          paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{
                width:36, height:36, borderRadius:10,
                background:'var(--grad-main)',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <BotIcon />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700 }}>AI Analysis — Round {analyses.length}</div>
                <div style={{ fontSize:'.72rem', color:'var(--text-muted)' }}>
                  Saved to database · {latestResult.timestamp}
                </div>
              </div>
              <span className="badge badge-green">✓ Saved</span>
            </div>

            <AnalysisMarkdown content={latestResult.analysis} />

            <div style={{
              marginTop:16, padding:'10px 14px',
              background:'rgba(79,142,247,.07)', border:'1px solid rgba(79,142,247,.2)',
              borderRadius:10, fontSize:'.8rem', color:'var(--blue)',
            }}>
              💡 Still seeing issues? Add more logs or ask a follow-up and click <strong>Analyze</strong> again.
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: History + Generate report ─────────────────── */}
      <div className="analysis-history-panel" style={{ width:310, flexShrink:0 }}>
        <div className="glass analysis-history-inner" style={{ padding:20, position:'sticky', top:80 }}>
          <div style={{ marginBottom:16, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
              <div style={{ fontWeight:700, fontSize:'.95rem' }}>Analysis History</div>
              {analyses.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={{
                    background: confirmClear ? 'rgba(239,68,68,.25)' : 'rgba(239,68,68,.1)',
                    border: `1px solid ${confirmClear ? 'rgba(239,68,68,.6)' : 'rgba(239,68,68,.25)'}`,
                    color: confirmClear ? '#f87171' : '#f87171',
                    borderRadius: 8, padding:'3px 10px',
                    fontSize:'.72rem', fontWeight:700, cursor:'pointer',
                    transition:'all .2s',
                  }}
                  title="Clear all history"
                >
                  {confirmClear ? '⚠️ Confirm Clear' : '🗑 Clear All'}
                </button>
              )}
            </div>
            <div style={{ fontSize:'.72rem', color:'var(--text-muted)' }}>
              {analyses.length === 0
                ? 'No rounds yet — analyze to begin'
                : `${analyses.length} round${analyses.length !== 1 ? 's' : ''} · persisted across reloads`}
            </div>
          </div>

          {analyses.length === 0 && (
            <div style={{
              textAlign:'center', padding:'28px 0',
              color:'var(--text-muted)', fontSize:'.83rem',
            }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>🔍</div>
              Submit a log or error to start your RCA session
            </div>
          )}

          <div className="analysis-history-list" style={{ maxHeight:460, overflowY:'auto', paddingRight:2 }}>
            {analyses.map((item, i) => (
              <RoundCard
                key={i} item={item} index={i}
                expanded={expandedIdx === i}
                onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                onDelete={() => deleteRound(i)}
              />
            ))}
          </div>

          {analyses.length > 0 && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              <button
                className="btn btn-secondary"
                style={{ width:'100%', justifyContent:'center' }}
                onClick={() => navigate('/report')}
              >
                <ReportIcon /> Generate RCA Report
              </button>
              <div style={{ fontSize:'.7rem', color:'var(--text-muted)', textAlign:'center', marginTop:8 }}>
                Compiles all {analyses.length} round{analyses.length !== 1 ? 's' : ''} into a formal report
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
