# gdrive-rag

A production-style RAG (Retrieval-Augmented Generation) system that connects to Google Drive, processes your documents, and lets you ask questions in plain English — with answers grounded in your actual files and source citations on every response.

---

## Demo

| Landing Page | Dashboard |
|---|---|
| Clean hero with Google Drive OAuth connect | Chat interface with sidebar knowledge base |

**Sample interaction:**

> **Query:** What was Amazon's operating cash flow for 2024?
>
> **Answer:** Amazon's operating cash flow was $115.9 billion for the trailing twelve months in 2024.
>
> **Sources:** `AMZN-Q4-2025-Earnings-Release.pdf`

---

## Architecture

```
Google Drive
     │
     ▼
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  connectors/ │────▶│   processing/    │────▶│  embedding/   │
│  gdrive.py   │     │   parser.py      │     │  embedder.py  │
│  OAuth 2.0   │     │  Extract + Chunk │     │ all-MiniLM-L6 │
└─────────────┘     └──────────────────┘     └───────┬───────┘
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  api/        │◀────│    search/       │◀────│     FAISS     │
│  routes.py   │     │ vector_store.py  │     │  IndexFlatIP  │
│  FastAPI     │     │  Top-K retrieval │     │  384-dim      │
└──────┬──────┘     └──────────────────┘     └───────────────┘
       │
       ▼
  Groq LLaMA 3.3 70B
  (answer + sources)
       │
       ▼
  Next.js Frontend
```

**RAG Pipeline — 5 stages:**

1. **Connector** — OAuth 2.0 web flow authenticates once, stores refresh token. Incremental sync checks `modifiedTime` per file — only new or changed files are re-processed.
2. **Processing** — PyMuPDF for PDFs, python-docx for Word docs, native read for TXT. Text is cleaned then chunked into 250-word windows with 50-word overlap to prevent answers being cut at chunk boundaries.
3. **Embedding** — `all-MiniLM-L6-v2` from SentenceTransformers converts each chunk to a 384-dimensional L2-normalized vector.
4. **Storage** — Vectors stored in FAISS `IndexFlatIP` (exact cosine similarity). Chunk metadata stored in MongoDB with a JSON fallback for local development.
5. **Query** — Query embedded with the same model → FAISS top-15 retrieval → optional metadata filtering to scope results to a specific document → context passed to LLaMA 3.3 70B via Groq → answer with source citations returned.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Google Drive | google-auth-oauthlib, google-api-python-client |
| Document Parsing | PyMuPDF, python-docx |
| Embeddings | SentenceTransformers `all-MiniLM-L6-v2` |
| Vector Store | FAISS (IndexFlatIP) |
| Database | MongoDB Atlas (with local JSON fallback) |
| LLM | LLaMA 3.3 70B via Groq API |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Containerization | Docker, Docker Compose |

---

## Project Structure

```
gdrive-rag/
├── backend/
│   ├── api/
│   │   └── routes.py          # FastAPI endpoints (/auth, /sync-drive, /ask, /documents)
│   ├── connectors/
│   │   └── gdrive.py          # Google Drive OAuth + incremental file sync
│   ├── processing/
│   │   └── parser.py          # Text extraction + 250-word chunking with overlap
│   ├── embedding/
│   │   └── embedder.py        # SentenceTransformers batch embedding
│   ├── search/
│   │   └── vector_store.py    # FAISS index build, save, load, search
│   ├── db.py                  # MongoDB client with MockCollection fallback
│   ├── main.py                # FastAPI app + CORS
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Landing page
│   │   │   └── dashboard/
│   │   │       └── page.tsx   # Main dashboard
│   │   └── components/
│   │       ├── ChatInterface.tsx
│   │       ├── SyncPanel.tsx
│   │       ├── DocsPanel.tsx
│   │       └── StorageStats.tsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Cloud project with Drive API enabled
- A Groq API key (free at console.groq.com)
- MongoDB Atlas cluster (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/gdrive-rag.git
cd gdrive-rag
```

### 2. Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Create a new project
2. Enable **Google Drive API** under APIs & Services → Library
3. Go to **APIs & Services → OAuth consent screen** → External → fill in app name and email
4. Add scope: `https://www.googleapis.com/auth/drive.readonly`
5. Add your Gmail as a Test User
6. Go to **Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:8000/auth/callback`
7. Download the JSON → rename to `credentials.json` → place in `backend/`

### 3. Backend setup

```bash
cd backend

# Create .env file
cp .env.example .env
# Fill in your values:
# GROQ_API_KEY=gsk_...
# MONGO_URI=mongodb+srv://...
# GOOGLE_CREDENTIALS_PATH=credentials.json
# FRONTEND_URL=http://localhost:3000
# API_URL=http://localhost:8000

# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn main:app --reload --port 8000
```

> **Mac users:** If you see SSL certificate errors with MongoDB, run:
> `/Applications/Python\ 3.XX/Install\ Certificates.command`

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

### Step 1 — Connect Google Drive

Click **Connect Google Drive** on the landing page. You'll be redirected to Google's OAuth consent screen. Sign in and grant read-only access. You'll be redirected back to the dashboard automatically.

### Step 2 — Sync your documents

Click **Sync Drive** in the sidebar. The system fetches PDFs, Google Docs, and TXT files from your Drive, extracts text, chunks it, embeds it, and stores it in FAISS. Only new or modified files are processed on subsequent syncs.

To sync a specific folder, paste a Google Drive folder URL in the input field before syncing.

### Step 3 — Ask questions

Type any question in the chat input. The system retrieves the most relevant chunks from your documents and generates a grounded answer with source citations. Click any source chip to get a full document summary.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/auth/status` | Check if user is authenticated |
| GET | `/auth/login` | Start Google OAuth flow |
| GET | `/auth/callback` | OAuth callback, saves token |
| POST | `/sync-drive` | Sync Drive files into FAISS |
| POST | `/ask` | Ask a question, get RAG answer |
| GET | `/documents` | List all synced documents |
| GET | `/storage/stats` | FAISS vector count, index size |
| DELETE | `/chat` | Clear chat history |
| POST | `/disconnect-drive` | Remove token, reset sync |

---

## Sample Queries

```
"What is our refund policy?"
"Summarize the Q4 earnings report"
"What are the key risks mentioned in the board meeting notes?"
"Compare revenue figures across all synced reports"
"What does the employee handbook say about remote work?"
```

The system returns an answer with the exact source files it used. If the answer isn't in your documents, it says so — no hallucination.

---

## Design Decisions

**Why 250-word chunks?**
`all-MiniLM-L6-v2` has a hard 256-token limit. Larger chunks get silently truncated, destroying embedding quality. This is a common RAG bug — explicit chunk sizing prevents it.

**Why FAISS over OpenSearch?**
FAISS runs in-process with zero infrastructure overhead for local development. The vector store is abstracted behind `vector_store.py` — swapping to OpenSearch is a single file change.

**Why incremental sync?**
Re-embedding an entire Drive on every sync is expensive. Tracking `modifiedTime` per file in MongoDB means only changed files are re-processed.

**Why LLaMA 3.3 70B via Groq?**
Free, fast inference with a large context window — handles 15 chunks of context without hitting limits. Easily swappable by changing the model string in `routes.py`.

---

## Docker

```bash
# Run both backend and frontend
docker-compose up --build
```

Backend runs on port 8000, frontend on port 3000.

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `MONGO_URI` | MongoDB Atlas connection string |
| `GOOGLE_CREDENTIALS_PATH` | Path to credentials.json (default: `credentials.json`) |
| `FRONTEND_URL` | Frontend URL for OAuth redirect (default: `http://localhost:3000`) |
| `API_URL` | Backend URL for OAuth callback (default: `http://localhost:8000`) |

---

## License

MIT