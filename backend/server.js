import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

// ─── Postgres pool ────────────────────────────────────────────────────────────
const pool = new Pool({
  host:                    process.env.PGHOST     || 'localhost',
  port:                    Number(process.env.PGPORT) || 5432,
  user:                    process.env.PGUSER     || 'postgres',
  password:                String(process.env.PGPASSWORD || ''),
  database:                process.env.PGDATABASE || 'rca_project',
  max:                     10,      // max connections in pool
  idleTimeoutMillis:       30000,   // close idle connections after 30 s
  connectionTimeoutMillis: 10000,   // wait up to 10 s for a free connection
  keepAlive:               true,    // send TCP keep-alive to prevent stale connections
  keepAliveInitialDelayMillis: 10000,
});

// Log pool errors but DO NOT crash the process — next request will get a fresh connection
pool.on('error', (err) => {
  console.error('[DB] Pool error (connection will be retried):', err.message);
});

// ─── DB query with one automatic retry ───────────────────────────────────────
// If the connection is stale the first attempt throws; we destroy it and retry once.
async function dbQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    // Only retry on connection-level errors, not query logic errors
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.message?.includes('terminating')) {
      console.warn('[DB] Connection error — retrying once:', err.message);
      await new Promise(r => setTimeout(r, 500));
      return pool.query(text, params);
    }
    throw err;
  }
}

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id          SERIAL PRIMARY KEY,
        log_content TEXT,
        error_code  TEXT,
        ai_analysis TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id         SERIAL PRIMARY KEY,
        report     TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[DB] Tables ready (analyses, reports).');
  } finally {
    client.release();
  }
}

// ─── Express app ─────────────────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.PORT) || 3001;

// Security headers (relax CSP so the browser fetching the API works fine)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS – accept any localhost origin
app.use(cors({
  origin: (origin, cb) => {
    // No origin = curl / internal requests → allow
    if (!origin) return cb(null, true);
    // Any localhost port → allow (local dev)
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    // In Docker/EC2 production, nginx proxies requests so backend sees no cross-origin.
    // Allow everything in production — nginx is the real perimeter guard.
    if (process.env.NODE_ENV === 'production') return cb(null, true);
    // Explicitly allowed APP_URL (e.g. EC2 IP)
    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    if (appUrl && origin === appUrl) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: false,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// ─── OpenRouter/OpenAI helper with automatic retry ───────────────────────────
async function callOpenAI(messages, { maxRetries = 2 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'PUT_YOUR_OPENAI_KEY_HERE') {
    throw new Error('AI key not configured — add OPENAI_API_KEY to backend/.env');
  }

  let lastErr;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model: 'openai/gpt-4o-mini', messages, temperature: 0.2 },
        {
          headers: {
            Authorization:  `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':  'http://localhost:3001',
            'X-Title':       'RCA Analysis Tool',
          },
          timeout: 60000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('AI returned an empty response — please try again.');
      return content;

    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const apiMsg = err.response?.data?.error?.message
                  || err.response?.data?.error
                  || err.message;

      // Don't retry on auth / bad-request errors — these won't self-heal
      if (status === 401) throw new Error('Invalid API key. Check OPENAI_API_KEY in backend/.env');
      if (status === 403) throw new Error('API key forbidden. Check your OpenRouter account/credits.');
      if (status === 400) throw new Error(`Bad request to AI: ${apiMsg}`);

      if (attempt <= maxRetries) {
        const delay = attempt * 1500; // 1.5 s, then 3 s
        console.warn(`[AI] Attempt ${attempt} failed (${status ?? 'network'}: ${apiMsg}) — retrying in ${delay}ms…`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error(`[AI] All ${maxRetries + 1} attempts failed. Last error: ${apiMsg}`);
      }
    }
  }

  // Produce a clean user-facing message from the last error
  const status = lastErr?.response?.status;
  const apiMsg = lastErr?.response?.data?.error?.message
              || lastErr?.response?.data?.error
              || lastErr?.message
              || 'Unknown error';

  if (status === 429) throw new Error('AI rate limit reached — please wait a moment and try again.');
  if (status >= 500)  throw new Error(`AI service is temporarily unavailable (${status}). Please retry in a few seconds.`);
  if (lastErr?.code === 'ECONNABORTED') throw new Error('AI request timed out (>60 s). Try a shorter input.');
  throw new Error(apiMsg);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', async (_req, res) => {
  try {
    await dbQuery('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// Analyze a log / error
app.post('/api/analyze', upload.single('logFile'), async (req, res) => {
  try {
    const logContent = String(req.body.logContent || '').trim();
    const errorCode  = String(req.body.errorCode  || '').trim();
    const fileText   = req.file ? req.file.buffer.toString('utf8').trim() : '';

    const combined = [logContent, errorCode, fileText]
      .filter(Boolean).join('\n\n---\n\n');

    if (!combined) {
      return res.status(400).json({ error: 'Provide log content, an error code, or a log file.' });
    }

    console.log('[Analyze] Input length:', combined.length, 'chars');

    // Detect if it looks like a log/error or a general question
    const looksLikeLog = /error|exception|failed|stack trace|traceback|fatal|warn|critical|null|undefined|econnrefused|timeout|refused|denied|crash|panic|segfault|\bat\b.*:\d+|\d{4}-\d{2}-\d{2}/i.test(combined);

    const systemPrompt = looksLikeLog
      ? 'You are a senior SRE / DevOps engineer and AI assistant specialised in root cause analysis. ' +
        'When given logs, stack traces, or error descriptions, identify the root cause and ' +
        'provide a structured Markdown response with these sections:\n' +
        '## Summary\n## Root Cause\n## Impacted Components\n## Fix Steps\n## Preventive Actions\n\n' +
        'If the user also asks a general question alongside logs, answer both.'
      : 'You are a helpful, knowledgeable AI assistant — like ChatGPT — with deep expertise in ' +
        'software engineering, DevOps, SRE, cloud infrastructure, databases, and root cause analysis. ' +
        'Answer questions clearly and helpfully in Markdown. ' +
        'If the question is about a technical error or log, provide RCA-style structured analysis. ' +
        'Otherwise, respond naturally and conversationally.';

    const analysis = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: combined },
    ]);

    console.log('[Analyze] AI responded, length:', analysis.length);

    const { rows } = await dbQuery(
      `INSERT INTO analyses (log_content, error_code, ai_analysis)
       VALUES ($1, $2, $3)
       RETURNING id, ai_analysis, created_at`,
      [logContent || fileText || null, errorCode || null, analysis],
    );

    const row = rows[0];
    return res.json({ id: row.id, analysis: row.ai_analysis, createdAt: row.created_at });
  } catch (err) {
    console.error('[Analyze] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Generate final RCA report (returns structured JSON for professional PDF)
app.post('/api/generate-report', async (req, res) => {
  try {
    const analyses = req.body?.analyses;
    if (!Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({ error: 'analyses array is required.' });
    }

    console.log('[Report] Generating structured report from', analyses.length, 'analyses');

    const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

    const rawReport = await callOpenAI([
      {
        role: 'system',
        content: `You are a senior incident manager writing a formal Root Cause Analysis (RCA) report for engineering leadership and stakeholders.
You must respond ONLY with a valid JSON object — no markdown fences, no extra text.

Return this exact structure:
{
  "reportTitle": "string — descriptive title like 'Database Connection Failure — RCA Report'",
  "project": "string — inferred from logs",
  "date": "${today}",
  "severity": "P1|P2|P3|P4",
  "overview": "string — 2-4 sentence executive summary of the incident",
  "incidentSummary": {
    "what": "string",
    "when": "string",
    "where": "string",
    "who": "string — affected users/systems"
  },
  "issues": [
    {
      "id": 1,
      "title": "string",
      "errorMessage": "string — exact error snippet",
      "rootCause": "string — detailed explanation",
      "fix": "string — what was done or should be done",
      "beforeCode": "string or null — broken code/config",
      "afterCode": "string or null — fixed code/config"
    }
  ],
  "timeline": [
    { "time": "string", "event": "string" }
  ],
  "changes": [
    { "component": "string", "before": "string", "after": "string" }
  ],
  "resolutionStatus": [
    { "issue": "string", "status": "Fixed|In Progress|Pending", "evidence": "string" }
  ],
  "preventiveActions": ["string"],
  "conclusion": "string — 2-3 sentence closing statement"
}`,
      },
      {
        role: 'user',
        content: `Here are the RCA analysis rounds:\n\n${JSON.stringify(analyses.map(a => ({
          round: analyses.indexOf(a) + 1,
          logContent: a.logContent,
          errorCode: a.errorCode,
          analysis: a.analysis,
        })), null, 2)}\n\nReturn the structured JSON report.`,
      },
    ]);

    let reportData;
    try {
      reportData = JSON.parse(rawReport);
    } catch {
      reportData = { reportTitle: 'RCA Report', overview: rawReport, issues: [], resolutionStatus: [], preventiveActions: [] };
    }

    console.log('[Report] Structured report ready, issues:', reportData.issues?.length);

    await dbQuery('INSERT INTO reports (report) VALUES ($1)', [JSON.stringify(reportData)]);

    return res.json({ report: reportData });
  } catch (err) {
    console.error('[Report] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n✅ RCA backend running → http://localhost:${PORT}`);
  console.log(`   OpenAI key: ${process.env.OPENAI_API_KEY ? '✅ loaded' : '❌ MISSING'}`);
  console.log(`   DB host   : ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}`);
  console.log(`   DB name   : ${process.env.PGDATABASE || 'rca_project'}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Kill the other process first.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

// Initialize DB tables after server is already listening
initDatabase().catch((err) => {
  console.error('[DB] Schema init failed:', err.message);
  console.error('     → Check PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE in backend/.env');
});

// ─── Global crash guards ──────────────────────────────────────────────────────
// Prevent the process from dying on unhandled async errors.
// Without these, a single bad request can kill the entire server.
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Promise Rejection — server kept alive:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception — server kept alive:', err.message);
});
