import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── tiny icon helpers ───────────────────────────────────────── */
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const BackIcon     = () => <Icon d="M19 12H5M12 5l-7 7 7 7" />;
const DownloadIcon = () => <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const PrintIcon    = () => <Icon d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />;

/* ── severity badge colour ─────────────────────────────────── */
const SEV_COLORS = { P1:'#ef4444', P2:'#f97316', P3:'#eab308', P4:'#22c55e' };
const STATUS_COLORS = { Fixed:'#22c55e', 'In Progress':'#eab308', Pending:'#ef4444' };

/* ── Inline report preview component ─────────────────────────── */
function ReportPreview({ data }) {
  const sev = data.severity || 'P2';
  const sevColor = SEV_COLORS[sev] || '#f97316';

  return (
    <div id="report-preview" style={{
      background:'#fff', color:'#1a1a2e',
      fontFamily:"'Inter','Segoe UI',Arial,sans-serif",
      fontSize:13, lineHeight:1.6,
      maxWidth:860, margin:'0 auto',
      boxShadow:'0 8px 40px rgba(0,0,0,0.25)',
      borderRadius:12, overflow:'hidden',
    }}>
      {/* ── Cover header ──────────────────────────────────────── */}
      <div style={{
        background:'linear-gradient(135deg,#0f2a5e,#1a3a7a)',
        padding:'28px 36px 24px',
        color:'#fff',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <img src="/logo.jpg" alt="Logo"
                 style={{ height:44, width:44, borderRadius:10, objectFit:'cover',
                          border:'2px solid rgba(255,255,255,0.25)' }}
                 onError={e => { e.target.style.display='none'; }} />
            <div>
              <div style={{ fontSize:11, opacity:.7, letterSpacing:1, textTransform:'uppercase' }}>Cloudly Bangladesh</div>
              <div style={{ fontSize:16, fontWeight:700 }}>Incident Management Platform</div>
            </div>
          </div>
          <div style={{
            background: sevColor, color:'#fff',
            padding:'4px 14px', borderRadius:20,
            fontSize:12, fontWeight:700, letterSpacing:.5,
          }}>
            {sev} Severity
          </div>
        </div>

        <h1 style={{ fontSize:22, fontWeight:800, margin:'0 0 8px', lineHeight:1.2 }}>
          {data.reportTitle || 'Root Cause Analysis Report'}
        </h1>
        <div style={{ fontSize:12, opacity:.75, display:'flex', gap:20, flexWrap:'wrap' }}>
          <span>📁 Project: <strong>{data.project || 'N/A'}</strong></span>
          <span>📅 Date: <strong>{data.date || new Date().toLocaleDateString()}</strong></span>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ padding:'28px 36px' }}>

        {/* 1. Overview */}
        <Section num="1" title="Overview">
          <p style={{ color:'#374151', lineHeight:1.7, fontSize:13 }}>{data.overview}</p>
          {data.incidentSummary && (
            <table style={{ width:'100%', borderCollapse:'collapse', marginTop:14, fontSize:12 }}>
              <tbody>
                {[
                  ['What', data.incidentSummary.what],
                  ['When', data.incidentSummary.when],
                  ['Where', data.incidentSummary.where],
                  ['Who Affected', data.incidentSummary.who],
                ].map(([k, v]) => v ? (
                  <tr key={k}>
                    <td style={{ fontWeight:700, padding:'6px 10px', width:130,
                                 background:'#f1f5f9', borderBottom:'1px solid #e2e8f0',
                                 borderRight:'1px solid #e2e8f0', color:'#1e3a5f' }}>{k}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid #e2e8f0', color:'#374151' }}>{v}</td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          )}
        </Section>

        {/* 2. Issues Summary table */}
        {data.issues?.length > 0 && (
          <Section num="2" title="Issues Summary">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#0f2a5e', color:'#fff' }}>
                  {['#', 'Issue', 'Root Cause', 'Fix Applied'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.issues.map((iss, i) => (
                  <tr key={i} style={{ background: i%2===0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding:'8px 12px', fontWeight:700, color:'#0f2a5e', borderBottom:'1px solid #e2e8f0', width:30 }}>{iss.id}</td>
                    <td style={{ padding:'8px 12px', fontWeight:600, color:'#1e3a5f', borderBottom:'1px solid #e2e8f0' }}>{iss.title}</td>
                    <td style={{ padding:'8px 12px', color:'#374151', borderBottom:'1px solid #e2e8f0', maxWidth:220 }}>{iss.rootCause?.slice(0,120)}{iss.rootCause?.length>120?'…':''}</td>
                    <td style={{ padding:'8px 12px', color:'#374151', borderBottom:'1px solid #e2e8f0' }}>{iss.fix?.slice(0,100)}{iss.fix?.length>100?'…':''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* 3. Detailed Analysis */}
        {data.issues?.length > 0 && (
          <Section num="3" title="Detailed Analysis">
            {data.issues.map((iss, i) => (
              <div key={i} style={{ marginBottom:24 }}>
                <h4 style={{ color:'#1a3a7a', fontSize:13, fontWeight:700, marginBottom:6 }}>
                  Issue {iss.id} — {iss.title}
                </h4>
                {iss.errorMessage && (
                  <>
                    <div style={{ fontSize:11, fontWeight:600, color:'#6b7280', marginBottom:4 }}>Error message:</div>
                    <code style={{
                      display:'block', padding:'8px 12px',
                      background:'#fef2f2', border:'1px solid #fecaca',
                      borderRadius:6, fontFamily:'Consolas,monospace',
                      fontSize:11, color:'#dc2626', marginBottom:8, wordBreak:'break-all',
                    }}>
                      {iss.errorMessage}
                    </code>
                  </>
                )}
                <p style={{ color:'#374151', fontSize:13, marginBottom: (iss.beforeCode||iss.afterCode)?10:0 }}>
                  {iss.rootCause}
                </p>
                {(iss.beforeCode || iss.afterCode) && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:10 }}>
                    {iss.beforeCode && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:4 }}>✗ Before (Broken)</div>
                        <pre style={{
                          background:'#fef2f2', border:'1px solid #fecaca',
                          borderRadius:6, padding:'10px 12px', fontSize:10,
                          fontFamily:'Consolas,monospace', overflow:'auto',
                          margin:0, color:'#1f2937', whiteSpace:'pre-wrap',
                        }}>{iss.beforeCode}</pre>
                      </div>
                    )}
                    {iss.afterCode && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:4 }}>✓ After (Fixed)</div>
                        <pre style={{
                          background:'#f0fdf4', border:'1px solid #bbf7d0',
                          borderRadius:6, padding:'10px 12px', fontSize:10,
                          fontFamily:'Consolas,monospace', overflow:'auto',
                          margin:0, color:'#1f2937', whiteSpace:'pre-wrap',
                        }}>{iss.afterCode}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* 4. Timeline */}
        {data.timeline?.length > 0 && (
          <Section num="4" title="Timeline">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#0f2a5e', color:'#fff' }}>
                  <th style={{ padding:'8px 12px', textAlign:'left', width:130 }}>Time</th>
                  <th style={{ padding:'8px 12px', textAlign:'left' }}>Event</th>
                </tr>
              </thead>
              <tbody>
                {data.timeline.map((t,i) => (
                  <tr key={i} style={{ background: i%2===0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding:'7px 12px', fontFamily:'Consolas,monospace', fontSize:11,
                                 color:'#1a3a7a', borderBottom:'1px solid #e2e8f0', fontWeight:600 }}>{t.time}</td>
                    <td style={{ padding:'7px 12px', color:'#374151', borderBottom:'1px solid #e2e8f0' }}>{t.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* 5. Changes Made */}
        {data.changes?.length > 0 && (
          <Section num="5" title="Changes Made">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#0f2a5e', color:'#fff' }}>
                  {['#', 'Component', 'Before', 'After'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.changes.map((c,i) => (
                  <tr key={i} style={{ background: i%2===0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding:'7px 12px', fontWeight:700, color:'#0f2a5e', borderBottom:'1px solid #e2e8f0', width:30 }}>{i+1}</td>
                    <td style={{ padding:'7px 12px', fontWeight:600, color:'#1e3a5f', borderBottom:'1px solid #e2e8f0' }}>{c.component}</td>
                    <td style={{ padding:'7px 12px', color:'#dc2626', borderBottom:'1px solid #e2e8f0', fontFamily:'Consolas,monospace', fontSize:11 }}>{c.before}</td>
                    <td style={{ padding:'7px 12px', color:'#16a34a', borderBottom:'1px solid #e2e8f0', fontFamily:'Consolas,monospace', fontSize:11 }}>{c.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* 6. Resolution Status */}
        {data.resolutionStatus?.length > 0 && (
          <Section num="6" title="Resolution Status">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#0f2a5e', color:'#fff' }}>
                  {['Issue', 'Status', 'Evidence'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.resolutionStatus.map((r,i) => (
                  <tr key={i} style={{ background: i%2===0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding:'7px 12px', color:'#374151', borderBottom:'1px solid #e2e8f0' }}>{r.issue}</td>
                    <td style={{ padding:'7px 12px', borderBottom:'1px solid #e2e8f0' }}>
                      <span style={{
                        background: STATUS_COLORS[r.status]+'22',
                        color: STATUS_COLORS[r.status] || '#6b7280',
                        border: `1px solid ${STATUS_COLORS[r.status] || '#6b7280'}55`,
                        padding:'2px 10px', borderRadius:12,
                        fontSize:11, fontWeight:700,
                      }}>{r.status}</span>
                    </td>
                    <td style={{ padding:'7px 12px', color:'#374151', borderBottom:'1px solid #e2e8f0' }}>{r.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* 7. Preventive Actions */}
        {data.preventiveActions?.length > 0 && (
          <Section num="7" title="Preventive Actions">
            <ol style={{ paddingLeft:20 }}>
              {data.preventiveActions.map((a,i) => (
                <li key={i} style={{ color:'#374151', fontSize:13, marginBottom:6, lineHeight:1.6 }}>{a}</li>
              ))}
            </ol>
          </Section>
        )}

        {/* Conclusion */}
        {data.conclusion && (
          <div style={{
            background:'#f0f7ff', border:'1px solid #bfdbfe',
            borderRadius:8, padding:'14px 18px', marginTop:8,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#1e3a5f', marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>
              Conclusion
            </div>
            <p style={{ color:'#374151', fontSize:13, lineHeight:1.6, fontStyle:'italic', margin:0 }}>{data.conclusion}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop:32, paddingTop:16, borderTop:'1px solid #e2e8f0',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontSize:11, color:'#9ca3af',
        }}>
          <span>Generated by Cloudly Bangladesh RCA Platform</span>
          <span>{data.date}</span>
        </div>
      </div>
    </div>
  );
}

function Section({ num, title, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <span style={{
          background:'#0f2a5e', color:'#fff',
          width:24, height:24, borderRadius:6,
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700, flexShrink:0,
        }}>{num}</span>
        <h3 style={{
          fontSize:15, fontWeight:700, color:'#0f2a5e', margin:0,
          paddingBottom:6, borderBottom:'2px solid #0f2a5e', flex:1,
        }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── PDF generation (uses jsPDF + autoTable) ─────────────────── */
async function generatePDF(data) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W   = doc.internal.pageSize.getWidth();
  let y     = 0;

  // load logo
  let logoDataUrl = null;
  try {
    const resp = await fetch('/logo.jpg');
    const blob = await resp.blob();
    logoDataUrl = await new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(blob);
    });
  } catch { /* logo optional */ }

  // ── page helper ──────────────────────────────────────────────
  function checkPage(needed = 20) {
    if (y + needed > 270) {
      doc.addPage();
      y = 15;
    }
  }

  function drawHeader() {
    // dark blue header band
    doc.setFillColor(15, 42, 94);
    doc.rect(0, 0, W, 38, 'F');

    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'JPEG', 8, 5, 14, 14); } catch {}
    }

    doc.setTextColor(255,255,255);
    doc.setFontSize(8);
    doc.setFont('helvetica','normal');
    doc.text('Cloudly Bangladesh  ·  Incident Management Platform', logoDataUrl ? 26 : 8, 12);

    doc.setFontSize(14);
    doc.setFont('helvetica','bold');
    const title = data.reportTitle || 'RCA Report';
    doc.text(title.length > 60 ? title.slice(0,57)+'...' : title, logoDataUrl ? 26 : 8, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica','normal');
    doc.text(`Project: ${data.project||'N/A'}   |   Date: ${data.date||new Date().toLocaleDateString()}   |   Severity: ${data.severity||'N/A'}`, logoDataUrl ? 26 : 8, 30);

    y = 46;
  }

  function sectionTitle(num, title) {
    checkPage(14);
    doc.setFillColor(15, 42, 94);
    doc.roundedRect(8, y, 8, 6, 1, 1, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.text(String(num), 12, y + 4.3, { align:'center' });

    doc.setTextColor(15, 42, 94);
    doc.setFontSize(12);
    doc.text(title, 20, y + 4.5);

    doc.setDrawColor(15, 42, 94);
    doc.setLineWidth(0.4);
    doc.line(8, y + 7.5, W - 8, y + 7.5);
    y += 12;
  }

  function bodyText(text, indent = 8) {
    if (!text) return;
    checkPage(8);
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(9);
    doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(String(text), W - indent - 8);
    lines.forEach(line => {
      checkPage(6);
      doc.text(line, indent, y);
      y += 5;
    });
    y += 2;
  }

  // ── draw first page header ───────────────────────────────────
  drawHeader();

  // ── add header on each new page ──────────────────────────────
  const origAddPage = doc.addPage.bind(doc);
  doc.addPage = function(...args) {
    origAddPage(...args);
    doc.setFillColor(15, 42, 94);
    doc.rect(0, 0, W, 10, 'F');
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'JPEG', 8, 1.5, 7, 7); } catch {}
    }
    doc.setTextColor(255,255,255);
    doc.setFontSize(7);
    doc.text('Cloudly Bangladesh — RCA Report', logoDataUrl ? 18 : 8, 7);
    doc.text(`${data.reportTitle||''}`, W - 8, 7, { align:'right' });
    y = 15;
    return this;
  };

  // 1. Overview
  sectionTitle(1, 'Overview');
  bodyText(data.overview);

  if (data.incidentSummary) {
    const rows = [['What',data.incidentSummary.what],['When',data.incidentSummary.when],['Where',data.incidentSummary.where],['Who',data.incidentSummary.who]].filter(r=>r[1]);
    if (rows.length) {
      autoTable(doc, {
        startY: y, margin:{left:8,right:8}, theme:'grid',
        head:[['Field','Details']],
        body: rows,
        headStyles:{ fillColor:[15,42,94], fontSize:8 },
        bodyStyles:{ fontSize:8 },
        columnStyles:{ 0:{ cellWidth:35, fontStyle:'bold', textColor:[15,42,94] } },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  }

  // 2. Issues summary
  if (data.issues?.length) {
    sectionTitle(2, 'Issues Summary');
    autoTable(doc, {
      startY: y, margin:{left:8,right:8}, theme:'striped',
      head:[['#','Issue','Root Cause (short)','Fix Applied']],
      body: data.issues.map(i=>[
        i.id,
        i.title,
        (i.rootCause||'').slice(0,90)+(i.rootCause?.length>90?'…':''),
        (i.fix||'').slice(0,90)+(i.fix?.length>90?'…':''),
      ]),
      headStyles:{ fillColor:[15,42,94], fontSize:8 },
      bodyStyles:{ fontSize:7.5 },
      columnStyles:{ 0:{cellWidth:8}, 1:{cellWidth:44}, 2:{cellWidth:60} },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // 3. Detailed analysis per issue
  if (data.issues?.length) {
    sectionTitle(3, 'Detailed Analysis');
    for (const iss of data.issues) {
      checkPage(20);
      doc.setTextColor(26, 58, 122);
      doc.setFontSize(10);
      doc.setFont('helvetica','bold');
      doc.text(`Issue ${iss.id} — ${iss.title}`, 8, y);
      y += 6;

      if (iss.errorMessage) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(252, 165, 165);
        const errLines = doc.splitTextToSize(iss.errorMessage, W - 28);
        const errH = errLines.length * 4.5 + 6;
        checkPage(errH + 4);
        doc.roundedRect(8, y, W - 16, errH, 2, 2, 'FD');
        doc.setTextColor(220, 38, 38);
        doc.setFontSize(7.5);
        doc.setFont('courier','normal');
        errLines.forEach((l,li) => { doc.text(l, 12, y + 5 + li * 4.5); });
        y += errH + 4;
      }

      bodyText(iss.rootCause);

      if (iss.fix) {
        checkPage(10);
        doc.setFontSize(8);
        doc.setFont('helvetica','bold');
        doc.setTextColor(22, 163, 74);
        doc.text('Fix applied:', 8, y);
        y += 5;
        bodyText(iss.fix);
      }

      if (iss.beforeCode || iss.afterCode) {
        const halfW = (W - 24) / 2;

        if (iss.beforeCode) {
          const bLines = doc.splitTextToSize(iss.beforeCode, halfW - 8);
          const bH = bLines.length * 3.8 + 8;
          checkPage(bH + 10);
          doc.setFillColor(254, 242, 242);
          doc.setDrawColor(252, 165, 165);
          doc.roundedRect(8, y, halfW, bH, 2, 2, 'FD');
          doc.setTextColor(185, 28, 28);
          doc.setFontSize(7);
          doc.setFont('courier','normal');
          doc.text('✗ Before', 10, y + 5);
          bLines.forEach((l,li) => { doc.text(l, 10, y + 9 + li * 3.8); });
          if (iss.afterCode) {
            const aLines = doc.splitTextToSize(iss.afterCode, halfW - 8);
            doc.setFillColor(240, 253, 244);
            doc.setDrawColor(187, 247, 208);
            doc.roundedRect(8 + halfW + 8, y, halfW, bH, 2, 2, 'FD');
            doc.setTextColor(21, 128, 61);
            doc.text('✓ After', 10 + halfW + 8, y + 5);
            aLines.forEach((l,li) => { doc.text(l, 10 + halfW + 8, y + 9 + li * 3.8); });
          }
          y += bH + 6;
        }
      }
      y += 4;
    }
  }

  // 4. Timeline
  if (data.timeline?.length) {
    sectionTitle(4, 'Timeline');
    autoTable(doc, {
      startY: y, margin:{left:8,right:8}, theme:'striped',
      head:[['Time','Event']],
      body: data.timeline.map(t=>[t.time||'', t.event||'']),
      headStyles:{ fillColor:[15,42,94], fontSize:8 },
      bodyStyles:{ fontSize:8 },
      columnStyles:{ 0:{cellWidth:35, fontStyle:'bold', textColor:[15,42,94]} },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // 5. Changes Made
  if (data.changes?.length) {
    sectionTitle(5, 'Changes Made');
    autoTable(doc, {
      startY: y, margin:{left:8,right:8}, theme:'striped',
      head:[['#','Component','Before','After']],
      body: data.changes.map((c,i)=>[i+1, c.component||'', c.before||'', c.after||'']),
      headStyles:{ fillColor:[15,42,94], fontSize:8 },
      bodyStyles:{ fontSize:7.5 },
      columnStyles:{ 0:{cellWidth:8}, 1:{cellWidth:36} },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // 6. Resolution Status
  if (data.resolutionStatus?.length) {
    sectionTitle(6, 'Resolution Status');
    autoTable(doc, {
      startY: y, margin:{left:8,right:8}, theme:'striped',
      head:[['Issue','Status','Evidence']],
      body: data.resolutionStatus.map(r=>[r.issue||'', r.status||'', r.evidence||'']),
      headStyles:{ fillColor:[15,42,94], fontSize:8 },
      bodyStyles:{ fontSize:8 },
      columnStyles:{ 1:{ cellWidth:28 } },
      didParseCell: (d) => {
        if (d.section==='body' && d.column.index===1) {
          const s = String(d.cell.raw);
          d.cell.styles.textColor = s==='Fixed'?[22,163,74]:s==='In Progress'?[202,138,4]:[220,38,38];
          d.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // 7. Preventive Actions
  if (data.preventiveActions?.length) {
    sectionTitle(7, 'Preventive Actions');
    data.preventiveActions.forEach((a, i) => {
      checkPage(8);
      doc.setFontSize(8.5);
      doc.setFont('helvetica','normal');
      doc.setTextColor(55,65,81);
      const lines = doc.splitTextToSize(`${i+1}. ${a}`, W - 20);
      lines.forEach((l, li) => {
        checkPage(5);
        doc.text(l, 10, y);
        y += 5;
      });
      y += 1;
    });
  }

  // Conclusion
  if (data.conclusion) {
    checkPage(20);
    doc.setFillColor(240, 247, 255);
    doc.setDrawColor(191, 219, 254);
    const cLines = doc.splitTextToSize(data.conclusion, W - 28);
    const cH = cLines.length * 5 + 10;
    doc.roundedRect(8, y, W - 16, cH, 3, 3, 'FD');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.text('Conclusion', 14, y + 7);
    doc.setFont('helvetica','italic');
    doc.setTextColor(55, 65, 81);
    cLines.forEach((l, li) => { doc.text(l, 14, y + 13 + li * 5); });
    y += cH + 6;
  }

  // page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156,163,175);
    doc.setFont('helvetica','normal');
    doc.text(`Page ${i} of ${pageCount}  ·  Generated by Cloudly Bangladesh RCA Platform`, W / 2, 290, { align:'center' });
  }

  doc.save(`RCA_Report_${(data.reportTitle||'report').replace(/[^a-z0-9]/gi,'_').slice(0,40)}.pdf`);
}

/* ── Main ReportPage component ───────────────────────────────── */
export default function ReportPage({ analyses }) {
  const [reportData,  setReportData]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');
  const navigate = useNavigate();

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data } = await axios.post('/api/generate-report', { analyses });
      setReportData(data.report);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to generate report');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!reportData) return;
    setDownloading(true);
    try {
      await generatePDF(reportData);
    } catch (err) {
      console.error('PDF error', err);
    }
    setDownloading(false);
  };

  return (
    <div>
      {/* ── top action bar ─────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:24, flexWrap:'wrap', gap:12,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            <BackIcon /> Back to Analysis
          </button>
          <div>
            <div style={{ fontWeight:800, fontSize:'1.15rem' }}>
              <span className="gradient-text">RCA Report</span>
            </div>
            <div style={{ fontSize:'.73rem', color:'var(--text-muted)' }}>
              Based on {analyses.length} analysis round{analyses.length!==1?'s':''}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          {!reportData && !loading && (
            <button className="btn btn-primary" onClick={handleGenerate}>
              <PrintIcon /> Generate Report
            </button>
          )}
          {reportData && (
            <>
              <button className="btn btn-ghost" onClick={handleGenerate}>
                ↻ Regenerate
              </button>
              <button className="btn btn-success" onClick={handleDownload} disabled={downloading}>
                {downloading
                  ? <><div className="spinner" /> Generating PDF...</>
                  : <><DownloadIcon /> Download PDF</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── empty state ────────────────────────────────────── */}
      {analyses.length === 0 && (
        <div className="glass" style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>📋</div>
          <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>No analyses yet</div>
          <div style={{ color:'var(--text-secondary)', marginBottom:20 }}>Go back and run at least one analysis first</div>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            <BackIcon /> Start Analysis
          </button>
        </div>
      )}

      {/* ── loading ─────────────────────────────────────────── */}
      {loading && (
        <div className="glass animate-in" style={{ padding:48, textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
            <div style={{
              width:56, height:56, borderRadius:14,
              background:'linear-gradient(135deg,#ec4899,#f97316)',
              display:'flex', alignItems:'center', justifyContent:'center',
              animation:'pulse-glow 1.5s ease-in-out infinite',
            }}>
              <PrintIcon />
            </div>
          </div>
          <div style={{ fontWeight:700, fontSize:'1.05rem', marginBottom:6 }}>
            AI is compiling the formal RCA report...
          </div>
          <div style={{ color:'var(--text-secondary)', fontSize:'.88rem' }}>
            Structuring incidents, timeline, resolution status, and preventive actions
          </div>
        </div>
      )}

      {/* ── error ───────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{
          background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)',
          borderRadius:10, padding:'12px 16px', marginBottom:16, color:'#f87171',
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ── start prompt ────────────────────────────────────── */}
      {!loading && !reportData && analyses.length > 0 && !errorMsg && (
        <div className="glass animate-in" style={{ padding:36, textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📄</div>
          <div style={{ fontWeight:700, fontSize:'1.05rem', marginBottom:8 }}>Ready to generate your RCA report</div>
          <div style={{ color:'var(--text-secondary)', marginBottom:20, fontSize:'.88rem' }}>
            The AI will compile all {analyses.length} analysis round{analyses.length!==1?'s':''} into a formal, downloadable PDF report
          </div>
          <button className="btn btn-primary" onClick={handleGenerate} style={{ margin:'0 auto' }}>
            <PrintIcon /> Generate Formal RCA Report
          </button>
        </div>
      )}

      {/* ── report preview ──────────────────────────────────── */}
      {reportData && !loading && (
        <div className="animate-in">
          <div style={{
            background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)',
            borderRadius:10, padding:'10px 16px', marginBottom:20,
            display:'flex', alignItems:'center', gap:10, fontSize:'.85rem', color:'#4ade80',
          }}>
            ✅ Report generated successfully — saved to database.
            <span style={{ color:'var(--text-muted)' }}>Click "Download PDF" to save the formatted report.</span>
          </div>
          <ReportPreview data={reportData} />
        </div>
      )}
    </div>
  );
}
