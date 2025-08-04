# 🚀 Deployment Guide

## Quick Deploy Options

### 1. Railway (Recommended)
1. **Connect GitHub**: Link your repository to Railway
2. **Environment Variables**: Add these in Railway dashboard:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   WEAVIATE_URL=your_weaviate_url
   WEAVIATE_API_KEY=your_weaviate_api_key
   OPENWEATHER_API_KEY=your_openweather_api_key (optional)
   ```
3. **Deploy**: Railway will automatically build and deploy using the Dockerfile

### 2. Render
1. **New Web Service**: Create a new Web Service
2. **Connect Repository**: Link your GitHub repo
3. **Build Command**: `npm run build`
4. **Start Command**: `node dist/server.js`
5. **Environment Variables**: Add the same variables as above

### 3. Local Docker
```bash
# Build and run locally
docker build -t rag-agent-server .
docker run -p 3000:3000 rag-agent-server
```

### 4. Docker Compose (Local)
```bash
# Create .env file with your variables
docker-compose up -d
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `WEAVIATE_URL` | ✅ | Weaviate cluster URL |
| `WEAVIATE_API_KEY` | ✅ | Weaviate API key |
| `OPENWEATHER_API_KEY` | ❌ | OpenWeather API key (uses mock data if not provided) |
| `PORT` | ❌ | Server port (default: 3000) |
| `NODE_ENV` | ❌ | Environment (default: production) |

## Health Check

After deployment, verify the service is running:

```bash
curl https://your-app-url.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-08-04T20:00:00.000Z",
  "services": {
    "memory": true,
    "rag": true
  }
}
```

## API Endpoints

- **Health Check**: `GET /health`
- **Agent Message**: `POST /agent/message`
- **RAG Process**: `POST /rag/process`
- **RAG Search**: `POST /rag/search`
- **RAG Stats**: `GET /rag/stats`

## Example Usage

```bash
# Send a message to the agent
curl -X POST https://your-app-url.railway.app/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-123",
    "message": "What is 5 + 3 * 2?"
  }'

# Check RAG health
curl https://your-app-url.railway.app/rag/health
```

## Troubleshooting

### Common Issues:
1. **Build fails**: Check if all dependencies are in `package.json`
2. **Environment variables**: Ensure all required variables are set
3. **Weaviate connection**: Verify Weaviate URL and API key
4. **Port binding**: Ensure port 3000 is exposed

### Logs:
- Railway: Check logs in Railway dashboard
- Render: Check logs in Render dashboard
- Local: `docker logs rag-agent-server`