# 🚀 Behzod Chat Widget - Quick Start

## What We Built

A fully functional chat widget for your website that uses the same AI agent as your Telegram bot!

## Files Created

```
public/
├── chat-widget.html      # Standalone widget page
├── demo.html             # Demo page with widget
└── behzod-widget.js      # Embeddable widget script

src/
└── web-chat.ts           # Web chat handler (sessions + agent)

doc/
└── WIDGET_SETUP.md       # Full documentation
```

## How It Works

```
User visits website
    ↓
Widget loads (behzod-widget.js)
    ↓
User sends message
    ↓
POST /api/chat { userId, message }
    ↓
web-chat.ts creates session
    ↓
Behzod agent processes (same as Telegram)
    ↓
Response sent back to widget
```

## Session Management

✅ **No database needed!** Uses existing Redis:

- **localStorage** → User ID (persistent)
- **Redis** → Conversation checkpoints (30 min TTL)
- **Mem0** → User memories (permanent)

Each web user gets a unique session like Telegram users.

## Test It Now

### 1. Start Server

```bash
bun run dev
```

### 2. Open Demo

```bash
# Visit in browser:
http://localhost:3000/demo
```

### 3. Click Purple Button

Chat with Behzod! 🤖

## Embed on Your Website

Add this single line:

```html
<script src="https://your-domain.com/behzod-widget.js"></script>
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/demo` | GET | Demo page |
| `/widget` | GET | Standalone widget |
| `/behzod-widget.js` | GET | Embeddable script |
| `/api/chat` | POST | Send message |

## Features

✅ Same AI agent as Telegram bot
✅ Persistent memory (Mem0)
✅ Session management (Redis)
✅ Issue tracking (Trello)
✅ Bilingual (Uzbek/Russian)
✅ Responsive design
✅ No extra dependencies
✅ Works with existing infrastructure

## Customization

Edit `public/behzod-widget.js`:

- **Colors** → Change gradient CSS
- **Avatar color** → Set `window.BEHZOD_AVATAR_SEED = 'behzod-blue'` before loading the widget
- **Position** → Modify bottom/right values
- **Welcome message** → Edit initial bot message
- **Size** → Adjust width/height

## Production Deployment

Same as Telegram bot! The widget is integrated into `main.ts`:

```bash
# Set environment variables
WEBHOOK_URL=https://your-domain.com

# Deploy
bun run start
```

Widget will be available at:
- `https://your-domain.com/demo`
- `https://your-domain.com/behzod-widget.js`

## Dashboard Security

- `/` and `/logs` are localhost-only by default
- Set `ADMIN_DASHBOARD_TOKEN` to allow remote access
- Pass the token as `?token=...` or `X-Admin-Token` when opening the dashboard remotely

## CORS (If Needed)

If widget is on different domain:

```bash
bun add @elysiajs/cors
```

```typescript
// In main.ts
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  .use(cors({ origin: ['https://your-website.com'] }))
  // ... rest
```

## What's Next?

1. ✅ Test locally at `/demo`
2. ✅ Customize colors/position
3. ✅ Deploy to production
4. ✅ Embed on your website
5. ✅ Monitor logs at `/`

## Full Documentation

See `doc/WIDGET_SETUP.md` for:
- Advanced configuration
- Security considerations
- Performance optimization
- Troubleshooting
- Examples (React, Next.js, WordPress)

---

**That's it bro! No DB needed, just Redis. Same agent, same memory, same everything. Just works! 🔥**
