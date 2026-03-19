# Behzod Chat Widget Setup Guide

## Overview

The Behzod chat widget allows you to embed AI-powered customer support directly into your website. It uses the same intelligent agent as the Telegram bot, with persistent memory and issue tracking.

## Features

- 🚀 **Instant AI Responses** - Powered by Groq LLM (llama-3.3-70b)
- 🧠 **Smart Memory** - Remembers users across sessions using Mem0
- 🌐 **Bilingual** - Supports Uzbek and Russian
- 🎯 **Issue Tracking** - Automatically creates Trello tickets
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Lightweight** - Single script tag, no dependencies

## Architecture

```
Website → Widget (JS) → HTTP API → Behzod Agent → Redis/Mem0/Trello
```

## Voice (LiveKit)

The Crisp-style widget (`/behzod-widget-crisp.js`) includes an `Ovoz` tab for voice chat via LiveKit.

**Server env vars (optional):**
- `LIVEKIT_URL` (example: `wss://YOUR_PROJECT.livekit.cloud`)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_ROOM` (optional default room name, defaults to `behzod-voice`)

**Client config (optional):**
- `window.BEHZOD_LIVEKIT_ROOM` (overrides the room passed to the server token endpoint)
- `window.BEHZOD_LIVEKIT_CLIENT_URL` (overrides the LiveKit browser client script URL; default uses unpkg)

**Endpoint used by the widget:**
- `GET /api/livekit/token` (requires `X-Session-Token` header from `/api/chat/session`)

Note: LiveKit voice requires an AI voice agent/service to join the same room and publish audio back to the user.

**Session Management:**
- Each user gets a unique ID stored in localStorage
- Sessions persist for 30 minutes of inactivity
- Redis stores conversation checkpoints (same as Telegram)
- No additional database needed!

## Quick Start

### 1. Add Widget to Your Website

Add this single line before the closing `</body>` tag:

```html
<script src="https://your-domain.com/behzod-widget.js"></script>
```

That's it! The widget will appear in the bottom-right corner.

### 2. Custom API URL (Optional)

If your API is on a different domain:

```html
<script>
  window.BEHZOD_API_URL = 'https://api.your-domain.com';
</script>
<script src="https://your-domain.com/behzod-widget.js"></script>
```

## Available Endpoints

### Widget Files

- `GET /widget` - Standalone widget page
- `GET /demo` - Demo page with widget
- `GET /behzod-widget.js` - Embeddable widget script

### API Endpoints

- `POST /api/chat` - Send message to Behzod

**Request:**
```json
{
  "userId": "web_abc123",
  "message": "Login button not working"
}
```

**Response:**
```json
{
  "response": "Assalomu alaykum! Let me help you with the login issue..."
}
```

## Testing Locally

### 1. Start the Server

```bash
bun run dev
```

### 2. Open Demo Page

Visit: `http://localhost:3000/demo`

### 3. Test the Widget

Click the purple button in the bottom-right corner and start chatting!

## Deployment

### Option 1: Same Server as Telegram Bot

The widget is already integrated into `main.ts`. Just deploy as usual:

```bash
bun run start
```

### Option 2: Separate Widget Server

If you want to serve the widget from a CDN or separate server:

1. Copy `public/behzod-widget.js` to your CDN
2. Update `BEHZOD_API_URL` to point to your API server
3. Embed the script on your website

## Customization

### Change Widget Colors

Edit `public/behzod-widget.js` and modify the gradient:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Change Widget Position

Edit the CSS in `behzod-widget.js`:

```css
#behzod-widget-button {
  bottom: 20px;  /* Change this */
  right: 20px;   /* Change this */
}
```

### Change Welcome Message

Edit the initial message in `behzod-widget.js`:

```html
<div class="behzod-message bot">
  <div class="behzod-message-content">
    Your custom welcome message here! 👋
  </div>
</div>
```

## Session Management

**How it works:**

1. User opens widget → Generate unique ID (`web_abc123`)
2. User sends message → Create session with thread ID
3. Session persists for 30 minutes of inactivity
4. Redis stores conversation checkpoints
5. Mem0 stores long-term user memory

**Session Storage:**

- **localStorage** - User ID (persistent across page reloads)
- **Redis** - Conversation checkpoints (30 min TTL)
- **Mem0** - User profile and memories (permanent)

## CORS Configuration

If your widget is on a different domain than your API, add CORS headers:

```typescript
// In main.ts
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  .use(cors({
    origin: ['https://your-website.com'],
    credentials: true
  }))
  // ... rest of routes
```

Install the plugin:

```bash
bun add @elysiajs/cors
```

## Security Considerations

1. **Rate Limiting** - Consider adding rate limits to `/api/chat`
2. **User ID Validation** - Validate user IDs to prevent abuse
3. **CORS** - Restrict origins in production
4. **API Keys** - Never expose API keys in client-side code

## Monitoring

Check widget usage in the logs:

```bash
# View live logs
curl http://localhost:3000/logs

# Or visit the dashboard
open http://localhost:3000/
```

Look for `[WEB]` log entries:

```
💬 [WEB] Message from web_abc123: Login button not working
```

## Troubleshooting

### Widget Not Appearing

1. Check browser console for errors
2. Verify script URL is correct
3. Check if script is blocked by ad blockers

### Messages Not Sending

1. Check network tab for failed requests
2. Verify API endpoint is accessible
3. Check CORS headers if cross-origin

### Slow Responses

1. Check Groq API status
2. Verify Redis connection
3. Check server logs for errors

## Advanced: WebSocket Support (Future)

For real-time bidirectional communication, you can upgrade to WebSockets:

```typescript
// In main.ts
.ws('/ws/chat', {
  message(ws, message) {
    // Handle incoming messages
  },
  open(ws) {
    // New connection
  },
  close(ws) {
    // Connection closed
  }
})
```

This would enable:
- Real-time typing indicators
- Push notifications
- Live agent handoff

## Performance

**Benchmarks:**

- Widget load time: ~50ms
- First message response: ~2-3s (LLM inference)
- Subsequent messages: ~1-2s (with context)
- Memory overhead: ~100KB per session

**Optimization Tips:**

1. Use CDN for widget script
2. Enable gzip compression
3. Cache static assets
4. Use Redis for session storage (already implemented)

## Examples

### Embed on WordPress

Add to your theme's `footer.php`:

```php
<script src="https://your-domain.com/behzod-widget.js"></script>
```

### Embed on React

```jsx
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://your-domain.com/behzod-widget.js';
  script.async = true;
  document.body.appendChild(script);
  
  return () => {
    document.body.removeChild(script);
  };
}, []);
```

### Embed on Next.js

```jsx
// In _app.js or layout.js
import Script from 'next/script';

<Script src="https://your-domain.com/behzod-widget.js" />
```

## Support

For issues or questions:

1. Check the logs: `http://localhost:3000/`
2. Review this documentation
3. Contact the development team

---

**Built with:**
- LangGraph (agent orchestration)
- Groq (LLM inference)
- Mem0 (user memory)
- Redis (session storage)
- ElysiaJS (HTTP server)
