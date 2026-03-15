import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import AnalysisPage from './components/AnalysisPage';
import ReportPage   from './components/ReportPage';

const STORAGE_KEY = 'rca_analyses';

function Header() {
  const loc = useLocation();
  return (
    <header className="app-header" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 32px',
      background: 'rgba(8,11,20,0.85)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      backdropFilter: 'blur(16px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo + brand */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <img
          src="/logo.jpg"
          alt="Cloudly Bangladesh"
          style={{ height:40, width:40, borderRadius:10, objectFit:'cover',
                   border:'1px solid rgba(255,255,255,0.12)' }}
          onError={e => { e.target.style.display='none'; }}
        />
        <div>
          <div style={{ fontSize:'.72rem', color:'#8892aa', fontWeight:500, letterSpacing:'.5px', textTransform:'uppercase' }}>
            Cloudly Bangladesh
          </div>
          <div style={{ fontSize:'1.05rem', fontWeight:800, lineHeight:1.1 }}
               className="gradient-text">
            RCA Intelligence Platform
          </div>
        </div>
      </div>

      {/* Nav / status badge */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span className="badge badge-green">
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
          System Online
        </span>
        {loc.pathname === '/' ? (
          <span className="badge badge-blue">Analysis Mode</span>
        ) : (
          <span className="badge badge-purple">Report Mode</span>
        )}
      </div>
    </header>
  );
}

function AppInner() {
  const [analyses, setAnalyses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever analyses change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
    } catch { /* quota exceeded — ignore */ }
  }, [analyses]);

  const clearAnalyses = () => {
    setAnalyses([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      <Header />
      <main className="app-main" style={{ flex:1, padding:'28px 32px', maxWidth:1400, margin:'0 auto', width:'100%' }}>
        <Routes>
          <Route path="/"       element={<AnalysisPage analyses={analyses} setAnalyses={setAnalyses} clearAnalyses={clearAnalyses} />} />
          <Route path="/report" element={<ReportPage   analyses={analyses} />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}
