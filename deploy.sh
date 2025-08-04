#!/bin/bash

# RAG Agent Server Deployment Script
echo "🚀 Deploying RAG Agent Server..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t rag-agent-server .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"

    # Run the container
    echo "🏃 Starting container..."
    docker run -d \
        --name rag-agent-server \
        -p 3000:3000 \
        -e NODE_ENV=production \
        -e PORT=3000 \
        -e GEMINI_API_KEY="$GEMINI_API_KEY" \
        -e WEAVIATE_URL="$WEAVIATE_URL" \
        -e WEAVIATE_API_KEY="$WEAVIATE_API_KEY" \
        -e OPENWEATHER_API_KEY="$OPENWEATHER_API_KEY" \
        rag-agent-server

    if [ $? -eq 0 ]; then
        echo "✅ Container started successfully!"
        echo "🌐 Server running at: http://localhost:3000"
        echo "🏥 Health check: http://localhost:3000/health"
        echo "🤖 Agent endpoint: http://localhost:3000/agent/message"

        # Wait a moment and check health
        echo "⏳ Waiting for server to start..."
        sleep 5

        # Health check
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Health check passed!"
        else
            echo "⚠️ Health check failed, but container is running"
        fi
    else
        echo "❌ Failed to start container"
        exit 1
    fi
else
    echo "❌ Docker build failed"
    exit 1
fi

echo "🎉 Deployment complete!"