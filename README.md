# LangGraph + Supermemory + Groq + ElysiaJS

A minimal, high-performance setup for a stateful AI agent with persistent memory.

## Setup

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Environment Variables**:
   Create a `.env` file (copy from `.env.example`) and add your keys:
   - `GROQ_API_KEY`: Get it from [Groq Console](https://console.groq.com/)
   - `SUPERMEMORY_API_KEY`: Get it from [Supermemory](https://supermemory.ai/)

3. **Run the Server**:
   ```bash
   bun dev
   ```

## API Usage

### Chat Endpoint
**POST** `http://localhost:3000/chat`

**Body**:
```json
{
  "messages": [
    { "role": "user", "content": "What did I save in my memory about machine learning?" }
  ]
}
```

The agent will automatically use the `search_memory` tool if it needs to look up information from your Supermemory.
