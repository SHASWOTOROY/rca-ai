# AI Integration Guide — Step by Step

A complete copy-paste guide to integrate OpenRouter AI (ChatGPT-compatible) into any Node.js + React project.

---

## Table of Contents

1. [Get an API Key](#1-get-an-api-key)
2. [Backend Setup — Node.js / Express](#2-backend-setup--nodejs--express)
3. [Environment Variables](#3-environment-variables)
4. [Core AI Helper Function](#4-core-ai-helper-function)
5. [API Endpoints](#5-api-endpoints)
6. [Frontend Setup — React + Vite](#6-frontend-setup--react--vite)
7. [Calling the AI from React](#7-calling-the-ai-from-react)
8. [Render Markdown AI Responses](#8-render-markdown-ai-responses)
9. [Docker + Nginx for Production](#9-docker--nginx-for-production)

---

## 1. Get an API Key

1. Go to **[https://openrouter.ai](https://openrouter.ai)** and sign up.
2. Navigate to **Keys** → **Create Key**.
3. Copy your key — it starts with `sk-or-v1-...`
4. Add credits under **Credits** (minimum $1 works fine for testing).

> **Alternative:** Use OpenAI directly at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)  
> The only difference is the base URL and model name (see Step 4).

---

## 2. Backend Setup — Node.js / Express

### 2.1 Initialize project

```bash
mkdir backend
cd backend
npm init -y
```

### 2.2 Install dependencies

```bash
npm install express cors helmet dotenv multer axios
```

| Package  | Purpose                                      |
|----------|----------------------------------------------|
| express  | Web framework / API server                   |
| cors     | Allow frontend to call the API               |
| helmet   | Security headers                             |
| dotenv   | Load secrets from `.env` file                |
| multer   | Accept file uploads (e.g. log files)         |
| axios    | HTTP client to call OpenRouter API           |

### 2.3 Add `"type": "module"` to `package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "axios": "^1.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^5.0.0",
    "helmet": "^8.0.0",
    "multer": "^2.0.0"
  }
}
```

---

## 3. Environment Variables

### 3.1 Create `backend/.env`

```ini
# ── AI Provider ────────────────────────────────────────────────
# OpenRouter key (starts with sk-or-v1-)
OPENAI_API_KEY=sk-or-v1-YOUR_KEY_HERE

# ── App ────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001

# Local:  http://localhost:8080
# EC2:    http://<EC2_PUBLIC_IP>:8080
APP_URL=http://localhost:8080
```

### 3.2 Create `backend/.env.example` (commit this, NOT `.env`)

```ini
OPENAI_API_KEY=your_openrouter_or_openai_key_here
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:8080
```

### 3.3 Add `.env` to `.gitignore`

```gitignore
.env
node_modules
```

---

## 4. Core AI Helper Function

This is the only function you need to call OpenRouter/OpenAI from your backend.  
Copy this into your `server.js` or a separate `ai.js` file.

```js
import axios from 'axios';

/**
 * Call OpenRouter (or OpenAI) Chat Completions API.
 *
 * @param {Array}  messages  - Array of { role: 'system'|'user'|'assistant', content: string }
 * @param {string} model     - Model name (see table below)
 * @returns {Promise<string>} - The AI's text response
 */
async function callAI(messages, model = 'openai/gpt-4o-mini') {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error('OPENAI_API_KEY is not set in .env');
  }

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',  // OpenRouter endpoint
    // For direct OpenAI, use: 'https://api.openai.com/v1/chat/completions'
    {
      model,
      messages,
      temperature: 0.2,   // 0 = deterministic, 1 = creative
    },
    {
      headers: {
        'Authorization':  `Bearer ${key}`,
        'Content-Type':   'application/json',
        'HTTP-Referer':   process.env.APP_URL || 'http://localhost:3001',
        'X-Title':        'My App',   // shown in OpenRouter dashboard
      },
      timeout: 60000,   // 60 seconds — AI calls can be slow
    },
  );

  // Extract the text response
  return response.data?.choices?.[0]?.message?.content ?? '';
}
```

### Available models on OpenRouter

| Model string                    | Notes                              |
|---------------------------------|------------------------------------|
| `openai/gpt-4o-mini`            | Fast, cheap, great quality ✅      |
| `openai/gpt-4o`                 | Best OpenAI model, higher cost     |
| `anthropic/claude-3-haiku`      | Fast Anthropic model               |
| `anthropic/claude-3.5-sonnet`   | Best Anthropic model               |
| `meta-llama/llama-3-8b-instruct`| Free tier available                |
| `mistralai/mistral-7b-instruct` | Free tier available                |

> For direct OpenAI, change the URL to `https://api.openai.com/v1/chat/completions`  
> and use model names like `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`.

---

## 5. API Endpoints

### 5.1 Full `server.js` template

Copy this entire file as your starting point.

```js
import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import dotenv  from 'dotenv';
import multer  from 'multer';
import axios   from 'axios';

dotenv.config();

const app  = express();
const PORT = Number(process.env.PORT) || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// Allow any localhost in dev; all origins in production (nginx is the guard)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    if (process.env.NODE_ENV === 'production') return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// ── AI helper (from Step 4) ────────────────────────────────────────────────────
async function callAI(messages, model = 'openai/gpt-4o-mini') {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set in .env');

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model, messages, temperature: 0.2 },
    {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.APP_URL || 'http://localhost:3001',
        'X-Title':       'My App',
      },
      timeout: 60000,
    },
  );

  return response.data?.choices?.[0]?.message?.content ?? '';
}

// ── Route 1: Simple chat ───────────────────────────────────────────────────────
// POST /api/chat
// Body: { message: "Hello, what is Docker?" }
// Returns: { reply: "Docker is a containerization platform..." }
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const reply = await callAI([
      {
        role: 'system',
        content: 'You are a helpful assistant. Answer clearly and concisely.',
        // ↑ Customize this system prompt for your use case
      },
      {
        role: 'user',
        content: message,
      },
    ]);

    return res.json({ reply });
  } catch (err) {
    console.error('[/api/chat]', err.message);
    return res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// ── Route 2: Analyze text / file ──────────────────────────────────────────────
// POST /api/analyze  (multipart/form-data)
// Fields: textInput (string), file (optional file upload)
// Returns: { analysis: "..." }
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    const textInput = String(req.body.textInput || '').trim();
    const fileText  = req.file ? req.file.buffer.toString('utf8').trim() : '';
    const combined  = [textInput, fileText].filter(Boolean).join('\n\n');

    if (!combined) {
      return res.status(400).json({ error: 'Provide textInput or upload a file' });
    }

    const analysis = await callAI([
      {
        role: 'system',
        content:
          'You are an expert analyst. Given text or file contents, ' +
          'provide a detailed analysis in Markdown format.',
        // ↑ Customize this system prompt for your use case
      },
      {
        role: 'user',
        content: `Analyze the following:\n\n${combined}`,
      },
    ]);

    return res.json({ analysis });
  } catch (err) {
    console.error('[/api/analyze]', err.message);
    return res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// ── Route 3: Generate a structured report ─────────────────────────────────────
// POST /api/generate-report
// Body: { data: [...] }  — pass whatever context you've collected
// Returns: { report: "..." }
app.post('/api/generate-report', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(400).json({ error: 'data is required' });
    }

    const report = await callAI([
      {
        role: 'system',
        content:
          'You are a professional report writer. ' +
          'Given a set of data and analyses, produce a polished, structured Markdown report. ' +
          'Use clear headings, bullet points, and tables where appropriate.',
        // ↑ Customize this system prompt for your use case
      },
      {
        role: 'user',
        content: `Here is the data:\n\n${JSON.stringify(data, null, 2)}\n\nGenerate the report.`,
      },
    ]);

    return res.json({ report });
  } catch (err) {
    console.error('[/api/generate-report]', err.message);
    return res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    ai: process.env.OPENAI_API_KEY ? 'key loaded' : 'KEY MISSING',
  });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n✅ Backend running → http://localhost:${PORT}`);
  console.log(`   AI key: ${process.env.OPENAI_API_KEY ? '✅ loaded' : '❌ MISSING — set OPENAI_API_KEY in .env'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} already in use. Kill the other process first.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});
```

### 5.2 Customizing system prompts

The **system prompt** is what controls the AI's personality and task.  
Change the `role: 'system'` content to match your use case:

```js
// Customer support bot
content: 'You are a friendly customer support agent for Acme Corp. Answer only questions related to our products.'

// Code reviewer
content: 'You are a senior software engineer. Review the code and provide feedback on bugs, performance, and best practices.'

// Data extractor (returns JSON)
content: 'You are a data extraction expert. Extract key information from the text and return it as a JSON object.'

// Translator
content: 'You are a professional translator. Translate the given text to French. Return only the translated text.'

// Summarizer
content: 'You are a summarization expert. Summarize the given text in 3-5 bullet points.'
```

---

## 6. Frontend Setup — React + Vite

### 6.1 Install dependencies

```bash
cd frontend
npm install axios react-markdown
```

### 6.2 Configure Vite proxy (`vite.config.js`)

This makes `/api/*` calls work in local dev without CORS issues.  
In production (Docker), nginx handles this proxy instead.

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Forward all /api/* requests to the backend during local dev
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

> **Important:** Always use `/api/chat` (relative URL), never `http://localhost:3001/api/chat`.  
> Relative URLs work in both local dev (Vite proxy) and production (nginx proxy) without any changes.

---

## 7. Calling the AI from React

### 7.1 Simple chat call

```jsx
import { useState } from 'react';
import axios from 'axios';

export default function ChatBox() {
  const [message,  setMessage]  = useState('');
  const [reply,    setReply]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError('');
    setReply('');

    try {
      const { data } = await axios.post('/api/chat', { message });
      setReply(data.reply);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Ask the AI anything..."
        rows={4}
      />
      <button onClick={handleSend} disabled={loading || !message.trim()}>
        {loading ? 'Thinking...' : 'Send'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {reply && <pre style={{ whiteSpace: 'pre-wrap' }}>{reply}</pre>}
    </div>
  );
}
```

### 7.2 File upload + analyze call

```jsx
import { useState, useRef } from 'react';
import axios from 'axios';

export default function AnalyzeBox() {
  const [textInput, setTextInput] = useState('');
  const [file,      setFile]      = useState(null);
  const [result,    setResult]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const fileRef = useRef();

  const handleAnalyze = async () => {
    setLoading(true);
    setResult('');

    try {
      // Use FormData to send both text and optional file
      const fd = new FormData();
      fd.append('textInput', textInput);
      if (file) fd.append('file', file);

      const { data } = await axios.post('/api/analyze', fd);
      setResult(data.analysis);
    } catch (err) {
      setResult('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={textInput}
        onChange={e => setTextInput(e.target.value)}
        placeholder="Paste text to analyze..."
        rows={6}
      />

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.log,.json,.csv"
        onChange={e => setFile(e.target.files[0])}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading || (!textInput.trim() && !file)}
      >
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>

      {result && <pre style={{ whiteSpace: 'pre-wrap' }}>{result}</pre>}
    </div>
  );
}
```

---

## 8. Render Markdown AI Responses

AI responses use Markdown formatting. Install `react-markdown` to render them properly.

```bash
npm install react-markdown
```

```jsx
import ReactMarkdown from 'react-markdown';

// Replace <pre>{reply}</pre> with this:
{reply && (
  <div className="ai-response">
    <ReactMarkdown>{reply}</ReactMarkdown>
  </div>
)}
```

### Basic CSS for the AI response box

```css
.ai-response {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px 20px;
  font-size: 0.9rem;
  line-height: 1.7;
}

.ai-response h2 { font-size: 1rem; font-weight: 700; margin: 1em 0 0.4em; }
.ai-response h3 { font-size: 0.9rem; font-weight: 600; color: #444; }
.ai-response p  { margin: 0.4em 0; color: #333; }
.ai-response ul { padding-left: 1.4em; }
.ai-response li { margin: 0.2em 0; }

.ai-response code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.82rem;
}

.ai-response pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.82rem;
}

.ai-response pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}
```

---

## 9. Docker + Nginx for Production

### 9.1 `Dockerfile.backend`

```dockerfile
FROM node:22-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
```

### 9.2 `Dockerfile.frontend`

```dockerfile
# Stage 1: Build React app
FROM node:22-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 9.3 `nginx/default.conf`

```nginx
server {
    listen      80;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # API proxy → Node.js backend container
    location /api/ {
        proxy_pass            http://backend:3001;
        proxy_http_version    1.1;
        proxy_set_header      Host              $host;
        proxy_set_header      X-Real-IP         $remote_addr;
        proxy_set_header      X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header      Connection        "";
        client_max_body_size  5m;
        proxy_read_timeout    65s;
        proxy_connect_timeout 10s;
        proxy_send_timeout    65s;
    }

    # React SPA
    location / {
        root      /usr/share/nginx/html;
        index     index.html;
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        root       /usr/share/nginx/html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        root       /usr/share/nginx/html;
        expires    1y;
        add_header Cache-Control "public, immutable";
    }

    location /health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }
}
```

### 9.4 `docker-compose.yml`

```yaml
services:

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: myapp_backend
    restart: unless-stopped
    env_file:
      - backend/.env
    environment:
      NODE_ENV: production
      PORT: "3001"
      APP_URL: "http://localhost:8080"   # ← change to EC2 IP/domain on server
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Linux EC2 only
    expose:
      - "3001"
    networks:
      - app_net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: myapp_frontend
    restart: unless-stopped
    ports:
      - "8080:80"      # access at http://localhost:8080  or  http://<EC2_IP>:8080
    networks:
      - app_net
    depends_on:
      backend:
        condition: service_healthy

networks:
  app_net:
    driver: bridge
```

### 9.5 `.dockerignore`

```
node_modules
*/node_modules
frontend/dist
.env
**/.env
*.log
.git
.vscode
```

### 9.6 Deploy commands

```bash
# Local
docker compose up --build -d
# Open: http://localhost:8080

# EC2 — change APP_URL in docker-compose.yml first, then:
docker compose up --build -d
# Open: http://<EC2_PUBLIC_IP>:8080
```

---

## Quick Checklist

```
[ ] Created backend/.env  with OPENAI_API_KEY=sk-or-v1-...
[ ] backend/.env added to .gitignore
[ ] callAI() function added to server.js
[ ] At least one POST /api/* route using callAI()
[ ] vite.config.js has server.proxy for /api → localhost:3001
[ ] All axios calls use /api/... (relative URL, no localhost hardcoded)
[ ] npm run dev  → backend and frontend both running
[ ] GET http://localhost:3001/health  returns { status: "ok", ai: "key loaded" }
[ ] Docker build works:  docker compose up --build
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `OPENAI_API_KEY is not set` | Create `backend/.env` and add the key |
| `You exceeded your current quota` | Top up credits at openrouter.ai or platform.openai.com |
| `Model not found` | Use a valid model from the table in Step 4 |
| `ECONNREFUSED` on frontend | Make sure backend is running (`node server.js`) |
| Blank page in Docker | Check `vite.config.js` has proxy, and axios uses relative `/api/` URLs |
| CORS error in browser | Make sure Vite proxy is configured and you're using relative URLs |
| Timeout on AI call | Increase `proxy_read_timeout` in nginx and `timeout` in axios |
