# 📝 Development Notes

## 🎯 Project Overview

**Goal**: Build a production-ready AI Agent Server with RAG, memory, and plugins in TypeScript/Node.js.

**Timeline**: Completed in under 6 hours as part of internship challenge.

---

## 🤖 AI vs Manual Contributions

| Component                         | Status           |
|----------------------------------|------------------|
| Code scaffolding (Fastify, env)  | 👨‍💻 Manual        |
| Weaviate schema config           | 👨‍💻 Manual        |
| RAG logic (chunking, search)     | 🤖 Assisted       |
| Plugin structure & code          | 👨‍💻 Manual        |
| Memory injection logic           | 👨‍💻 Manual        |
| TypeScript types/interfaces      | 🤖 Assisted       |
| Deployment config (Railway)      | 👨‍💻 Manual        |
| This README & NOTES.md           | 🤖 Draft + Manual |

---

## 🐛 Bugs Faced & Fixes

### 🧩 Schema Setup Not Persisting
- **Issue**: Programmatic schema setup in Weaviate kept failing.
- **Fix**: Used Weaviate UI to create class with `text2vec-weaviate`. Also my schema initialization for some reason kept creating the schema but without vectorization, so i had to manually create schema in my weaviate cloud and then process those 5 .md documents inside the cluster from our code.

### 💥 Memory Overload on Large Files
- **Issue**: Document processing was crashing Node due to large reads.

`<--- Last few GCs --->`

`[11508:00000210FEC02000]    33395 ms: Mark-Compact 4037.8 (4129.6) -> 4032.2 (4139.8) MB, pooled: 0 MB, 430.43 / 0.00 ms  (average mu = 0.677, current mu = 0.391) allocation failure; scavenge might not succeed
[11508:00000210FEC02000]    34214 ms: Mark-Compact 4047.9 (4139.8) -> 4039.7 (4147.6) MB, pooled: 0 MB, 790.12 / 0.00 ms  (average mu = 0.389, current mu = 0.036) allocation failure; scavenge might not succeed`


`<--- JS stacktrace --->`

`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----`

` 1: 00007FF70E1B20AD node::SetCppgcReference+17245
 2: 00007FF70E11A4D8 v8::base::CPU::num_virtual_address_bits+92376
 3: 00007FF70EC9A1B1 v8::Isolate::ReportExternalAllocationLimitReached+65
 4: 00007FF70EC87096 v8::Function::Experimental_IsNopFunction+2790
 5: 00007FF70EAD6920 v8::internal::StrongRootAllocatorBase::StrongRootAllocatorBase+31392
 6: 00007FF70EAD39BA v8::internal::StrongRootAllocatorBase::StrongRootAllocatorBase+19258
 7: 00007FF70EAE9251 v8::Isolate::GetHeapProfiler+7825
 8: 00007FF70EAE9ACA v8::Isolate::GetHeapProfiler+9994
 9: 00007FF70EAFA567 v8::Isolate::GetHeapProfiler+78247
10: 00007FF70E7C348B v8::internal::Version::GetString+434795`

- **Fix**: Added streaming generator with batch chunk creation. -- So what i did was implement a streaming generator approach that reads each .md file in smaller word batches and sends 2–3 chunks at a time for embedding. This drastically reduced memory usage and prevented crashes.

### ⚙️ Path Aliases Broken in Build
- **Issue**: `@/services` not resolving in `dist/`.
- **Fix**: Added `tsc-alias` to transform paths post-compilation for modular and neat code as per specified and code now look really neat and production level as it is.

---

## 🧠 Agent Architecture & Flow

### How the Agent Routes Plugin Calls + Embeds Memory + Context

The agent follows a sophisticated orchestration pattern that combines multiple data sources into a unified response:

#### 1. **Memory Management & Embedding**
```typescript
// Session-based memory with automatic cleanup
await this.memoryService.addMessage(sessionId, 'user', message);
const memorySummary = await this.memoryService.getFormattedSummary(sessionId);
```
- **Session persistence**: Each user gets unique session ID for conversation continuity
- **Message history**: Stores user/assistant messages with timestamps
- **Memory summarization**: Extracts last 2 exchanges (4 messages) for context
- **Automatic cleanup**: Removes old sessions to prevent memory leaks
- **Memory embedding**: Past conversation context is embedded into every prompt

#### 2. **Plugin Detection & Execution Flow**
```typescript
// Intent-based plugin routing
const pluginResults = await this.pluginManager.detectAndExecutePlugins(message);
```
**Plugin Detection Patterns:**
- **Weather plugin**: `/weather\s+(?:in\s+)?([a-zA-Z\s]+)/i` → "weather in Bangalore"
- **Math plugin**: `/(\d+(?:\s*[\+\-\*\/]\s*\d+)+)/` → "2 + 2 * 5"

**Execution Flow:**
1. **Intent Detection**: Each plugin implements `detectIntent(message)` method
2. **Parallel Execution**: All matching plugins execute simultaneously
3. **Error Isolation**: Failed plugins don't break the entire flow
4. **Result Collection**: All plugin outputs are gathered for context injection

#### 3. **RAG (Retrieval-Augmented Generation) Context**
```typescript
// Enhanced search with semantic retrieval
const searchQuery = this.enhanceSearchQuery(message);
const ragResults = await this.ragService.search(searchQuery, {
  maxSearchResults: config.rag.maxSearchResults,
  similarityThreshold: 0.5,
});
```
**Query Enhancement:**
- "what is X" → "X definition overview introduction basics"
- "how to Y" → "Y guide tutorial steps instructions"

**Retrieval Process:**
1. **Semantic Search**: Uses Weaviate's `nearText` for meaning-based retrieval
2. **Top-k Selection**: Gets top 3 most relevant document chunks
3. **Similarity Filtering**: Only includes results above 0.5 threshold
4. **Source Tracking**: Maintains document source and metadata

#### 4. **Context Integration & Prompt Engineering**
The agent builds a comprehensive prompt that embeds all context sources:

```typescript
// Structured prompt with all context layers
let prompt = `You are a helpful AI assistant with access to conversation memory, document knowledge, and plugin capabilities.

## CONVERSATION MEMORY
${memorySummary}

## DOCUMENT CONTEXT
${ragResults.map(result => `${result.source}: ${result.content}`).join('\n')}

## PLUGIN RESULTS
${pluginResults.map(result => `${result.name}: ${JSON.stringify(result.data)}`).join('\n')}

## USER MESSAGE
${message}

## INSTRUCTIONS
- Use document context to enhance responses with specific details
- Cite sources when using document information
- Incorporate plugin results naturally
- Maintain conversation continuity using memory
`;
```

#### 5. **Response Generation with Context**
```typescript
// LLM call with full context integration
const aiResponse = await this.generateAIResponse(prompt, message);
```
- **Context-aware generation**: All memory, RAG, and plugin data included
- **Source citation**: Agent cites document sources (e.g., "According to [filename]...")
- **Plugin integration**: Naturally incorporates weather/math results
- **Memory continuity**: Builds on previous conversation context

#### 6. **Response Assembly & Metadata**
```typescript
// Structured response with full transparency
return {
  reply: aiResponse,
  used_chunks: ragResults.map(result => ({
    content: result.content,
    source: result.source,
    score: result.score,
  })),
  plugins_used: pluginResults.map(result => ({
    name: result.name,
    success: result.success,
    data: result.data,
  })),
  memory_snapshot: memorySnapshot,
  session_id: sessionId,
};
```

#### 7. **Complete Flow Example**
```
User: "What's the weather in Bangalore and how does it compare to markdown benefits?"

1. MEMORY: "No previous conversation"
2. PLUGINS: Weather plugin detects "weather in Bangalore" → calls OpenWeather API
3. RAG: "markdown benefits" → searches documents → finds relevant chunks
4. CONTEXT: Builds prompt with weather data + markdown docs + user question
5. LLM: Generates response citing both weather and document sources
6. RESPONSE: Returns structured response with weather data, document chunks, and AI reply
```

This architecture ensures that every response is contextually rich, factually grounded, and conversationally coherent.