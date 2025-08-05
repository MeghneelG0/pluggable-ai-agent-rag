# Pluggable AI Agent with RAG, Memory, and Tools

> ⚡ This project was built as part of a 1-day technical internship challenge. The goal was to implement a pluggable AI agent with RAG, memory, and plugin capabilities — all deployed, documented, and tested within ~6 hours.

This project implements a conversational AI agent built on a modern Node.js and TypeScript stack. It features a robust architecture that incorporates Retrieval-Augmented Generation (RAG) for knowledge retrieval, persistent memory for conversational context, and a plugin system for extending its capabilities (e.g., performing calculations, fetching live data).

While integrating RAG in a strict TypeScript/Node.js-only stack was definitely a head-scratcher, it was a great learning curve in balancing backend efficiency with LLM orchestration.

Live deployed URL : https://pluggable-ai-agent-rag-production.up.railway.app/health

⚠️ Disclaimer
Backend Only: This project is a backend API service. No frontend UI has been developed yet.

Temporary Hosting:

Weaviate: Free cloud instance is valid for 14 days only.

Railway: Free deployment tier is active for 30 days from the deployment date.

The project will likely be deprecated once these free tiers expire unless upgraded or migrated. 

## Results:

You need to use Postman to check POST methods, here's the results -- all using deployed URL:

**1. RAG Testing**

<img width="851" height="632" alt="image" src="https://github.com/user-attachments/assets/0efd9b11-137c-465a-822f-f30df4e3767a" />

**2. Weather Plugin Testing**

<img width="851" height="644" alt="image" src="https://github.com/user-attachments/assets/70f3b6b2-cf99-4017-b78f-eefbff79157d" />

**3. Mathjs Plugin Testing**

<img width="850" height="644" alt="image" src="https://github.com/user-attachments/assets/a742889c-d3ca-43b7-9773-191052f171df" />

> code is modular, neat and you can check scalability issues in NOTES.md
## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Fastify API   │    │   Memory Map    │    │   Weaviate DB   │
│   (TypeScript)  │◄──►│  (In-Memory)    │    │  (Vector DB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Gemini Pro     │    │  Document       │    │  Plugin System  │
│  (LLM + Embed)  │    │  Processing     │    │  (Weather/Math) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Framework**: Fastify v4.29.1
- **Language**: TypeScript v5.2.2
- **LLM**: Google Gemini Pro (`gemini-2.0-flash-lite`)
- **Vector DB**: Weaviate (with `text2vec-weaviate`)
- **Validation**: Zod v3.22.4
- **Math**: mathjs v11.11.0

---

## 📋 Prerequisites

1. **Node.js** (v18+)
2. **Weaviate Cloud** account (or local instance)
3. **Google AI API Key** (for Gemini)
4. **OpenWeatherMap API Key** (for weather plugin)

---

## ⚙️ Setup

### 1. Clone & Install
```bash
git clone <your-repo>
cd rag-sys
npm install
```

### 2. Environment Variables
Create `.env` file:
```env
# Server
PORT=3000
NODE_ENV=development

# Google AI (Gemini)
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Weaviate
WEAVIATE_URL=https://your-cluster.weaviate.network
WEAVIATE_API_KEY=your_weaviate_api_key_here

# RAG Configuration
MAX_CHUNK_TOKENS=30
CHUNK_OVERLAP=5
MAX_SEARCH_RESULTS=3

# Weather Plugin (Optional)
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

### 3. Weaviate Schema Setup
**Important**: You must create the schema manually in Weaviate console:

1. Go to your Weaviate console
2. Create a new class named `DocumentChunk`
3. Set vectorizer to `text2vec-weaviate`
4. Add properties:
   - `content` (text)
   - `source` (text)
   - `fileName` (text)
   - `processedAt` (text)

### 4. Add Documents
Place your markdown files in `data/documents/` directory.

---

## 🚀 Deployment

### Quick Deploy (Railway - Recommended)
1. **Connect GitHub**: Link your repository to Railway
2. **Environment Variables**: Add required variables in Railway dashboard
3. **Deploy**: Railway automatically builds and deploys using Dockerfile

### Manual Deployment
```bash
# Build and run with Docker
docker build -t rag-agent-server .
docker run -p 3000:3000 rag-agent-server

# Or use Docker Compose
docker-compose up -d
```

### Environment Variables for Production
```
GEMINI_API_KEY=your_gemini_api_key
WEAVIATE_URL=your_weaviate_url
WEAVIATE_API_KEY=your_weaviate_api_key
OPENWEATHER_API_KEY=your_openweather_api_key (optional)
PORT=3000
NODE_ENV=production
```

📖 **Detailed deployment guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

### 5. Start Server
```bash
npm run dev
```

---

## 📚 API Reference

### 🏥 Health Check
```bash
GET /health
```

### 📄 Process Documents
```bash
POST /rag/process
```
Processes all markdown files in `data/documents/` and indexes them in Weaviate.

**Response:**
```json
{
  "success": true,
  "totalChunks": 335,
  "filesProcessed": 5,
  "timestamp": "2025-08-04T20:09:54.653Z"
}
```

### 🔍 Search Documents
```bash
POST /rag/search
Content-Type: application/json

{
  "query": "webex developer platform",
  "similarityThreshold": 0.7,
  "maxSearchResults": 3
}
```

**Response:**
```json
{
  "success": true,
  "query": "webex developer platform",
  "results": [
    {
      "content": "Webex Developer Platform provides...",
      "source": "webex-boosting-ai-performance-llm-friendly-markdown.md",
      "score": 0.85,
      "metadata": {
        "fileName": "webex-boosting-ai-performance-llm-friendly-markdown.md",
        "processedAt": "2025-08-04T20:09:54.653Z"
      }
    }
  ],
  "count": 1,
  "timestamp": "2025-08-04T20:09:54.653Z"
}
```

### 🤖 Chat with Agent
```bash
POST /agent/message
Content-Type: application/json

{
  "session_id": "user-123",
  "message": "What is markdown?"
}
```

**Response:**
```json
{
  "reply": "Markdown is a lightweight markup language...",
  "used_chunks": [
    {
      "content": "A Preferred Format for LLMs Markdown is...",
      "source": "webex-boosting-ai-performance-llm-friendly-markdown.md",
      "score": 0.53,
      "metadata": {
        "fileName": "webex-boosting-ai-performance-llm-friendly-markdown.md",
        "processedAt": "2025-08-04T20:09:54.653Z"
      }
    }
  ],
  "plugins_used": [],
  "memory_snapshot": [
    {
      "role": "user",
      "content": "What is markdown?",
      "timestamp": "2025-08-04T20:11:40.053Z"
    },
    {
      "role": "assistant",
      "content": "Markdown is a lightweight markup language...",
      "timestamp": "2025-08-04T20:11:42.224Z"
    }
  ],
  "session_id": "user-123"
}
```

---

## 🎯 Usage Examples

### Basic Chat
```bash
curl -X POST http://localhost:3000/agent/message \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-123", "message": "What is markdown?"}'
```

### Search Documents
```bash
curl -X POST http://localhost:3000/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "webex developer platform resources"}'
```

### Process Documents
```bash
curl -X POST http://localhost:3000/rag/process
```

---

## 🔧 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run clean        # Clean build artifacts
```

### Project Structure
```
rag-sys/
├── src/
│   ├── config/          # Environment & configuration
│   ├── services/        # Core services
│   │   ├── agent-simple.ts      # Main agent logic
│   │   ├── gemini.ts           # Gemini AI integration
│   │   ├── memory.ts           # Session memory
│   │   ├── weaviate.ts         # Vector database
│   │   ├── rag-streaming.ts    # Document processing
│   │   └── plugins/            # Plugin system (WIP)
│   ├── api/            # API routes
│   ├── types/          # TypeScript types
│   └── server.ts       # Fastify server setup
├── data/
│   └── documents/      # Markdown files to index
└── package.json
```

---

## 🎨 Features

### 🧠 **RAG (Retrieval-Augmented Generation)**
- **Document Chunking**: Intelligent text splitting with overlap
- **Semantic Search**: Vector similarity search using Weaviate
- **Source Attribution**: AI cites document sources in responses
- **Context Injection**: Relevant chunks included in AI prompts

### 💾 **Memory System**
- **Per-Session Storage**: In-memory conversation history
- **Context Awareness**: AI remembers previous exchanges
- **Memory Summarization**: Efficient context management

### 🤖 **AI Integration**
- **Gemini Pro**: State-of-the-art language model
- **Prompt Engineering**: Optimized prompts for RAG
- **Confidence Handling**: Graceful fallbacks for unknown topics

### 🔌 **Plugin System** (Coming Soon)
- **Weather Plugin**: Get weather information for cities
- **Math Plugin**: Safe mathematical expression evaluation
- **Intent Detection**: Automatic plugin selection

---

## 🚀 Deployment

### Railway (Recommended)
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Render
1. Create new Web Service
2. Connect repository
3. Set build command: `npm run build`
4. Set start command: `npm start`

---

## 🐛 Troubleshooting

### Common Issues

**1. Weaviate Connection Issues**
```
❌ Weaviate not available (using mock mode)
```
- Check `WEAVIATE_URL` and `WEAVIATE_API_KEY`
- Ensure Weaviate cluster is running
- Verify schema exists in console

**2. No Search Results**
```
"count": 0
```
- Run `POST /rag/process` to index documents
- Check document files exist in `data/documents/`
- Verify Weaviate schema configuration

**3. Gemini API Errors**
```
❌ Failed to generate completion
```
- Verify `GOOGLE_AI_API_KEY` is valid
- Check API quota and billing

### Debug Mode
```bash
DEBUG=* npm run dev
```

---

## 📈 Performance

### Current Metrics
- **Document Processing**: ~335 chunks in ~30 seconds
- **Search Response**: <500ms average
- **Memory Usage**: ~50MB baseline
- **Concurrent Sessions**: 100+ supported

### Optimization Tips
- Use smaller chunk sizes for faster processing
- Implement caching for frequent queries
- Consider Redis for production memory storage

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

---

## 📄 License

MIT License - see LICENSE file for details

---
