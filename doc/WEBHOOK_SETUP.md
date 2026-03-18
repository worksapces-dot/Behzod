# Telegram Webhook Setup 🚀

## Why Webhooks > Polling?

### Long Polling (Current - BAD ❌)
```
Bot → "Any messages?" → Telegram
Bot → "Any messages?" → Telegram (every 1-2 seconds)
Bot → "Any messages?" → Telegram
```
- Wastes resources
- 1-2 second delay
- Server always busy

### Webhooks (Better ✅)
```
User sends message → Telegram → INSTANTLY pushes to your bot
```
- Instant delivery (0ms delay)
- No wasted resources
- More reliable
- Telegram's recommended method

## Setup Options:

### Option 1: Ngrok (Easiest - 5 minutes)

**What is Ngrok?**
Creates a public URL that tunnels to your local server.

**Steps:**

1. **Install Ngrok**
   - Download: https://ngrok.com/download
   - Or: `choco install ngrok` (Windows)

2. **Sign up** (free): https://dashboard.ngrok.com/signup

3. **Get Auth Token**
   - Go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your token

4. **Configure Ngrok**
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

5. **Start Ngrok**
   ```bash
   ngrok http 3000
   ```

6. **Copy URL**
   You'll see something like:
   ```
   Forwarding: https://abc123.ngrok-free.app -> http://localhost:3000
   ```

7. **Update .env**
   ```bash
   WEBHOOK_URL=https://abc123.ngrok-free.app
   ```

8. **Restart Bot**
   ```bash
   bun run dev
   ```

**Pros:**
- ✅ Super easy
- ✅ Works immediately
- ✅ Free tier available

**Cons:**
- ❌ URL changes on restart (free tier)
- ❌ Need to keep ngrok running

---

### Option 2: Cloudflare Tunnel (Free Forever)

**What is Cloudflare Tunnel?**
Like ngrok but with permanent URLs (free forever).

**Steps:**

1. **Install Cloudflared**
   ```bash
   # Windows
   winget install --id Cloudflare.cloudflared
   ```

2. **Login**
   ```bash
   cloudflared tunnel login
   ```

3. **Create Tunnel**
   ```bash
   cloudflared tunnel create behzod-bot
   ```

4. **Configure Tunnel**
   Create `cloudflared-config.yml`:
   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: C:\Users\YOUR_USER\.cloudflared\YOUR_TUNNEL_ID.json

   ingress:
     - hostname: behzod.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. **Run Tunnel**
   ```bash
   cloudflared tunnel run behzod-bot
   ```

6. **Update .env**
   ```bash
   WEBHOOK_URL=https://behzod.yourdomain.com
   ```

**Pros:**
- ✅ Free forever
- ✅ Permanent URL
- ✅ More reliable
- ✅ Better performance

**Cons:**
- ❌ Slightly more setup
- ❌ Need domain (or use Cloudflare's)

---

### Option 3: Deploy to Cloud (Production)

**Best for production:**

1. **Railway.app** (Easiest)
   - Free $5/month credit
   - Auto-deploys from GitHub
   - Automatic HTTPS

2. **Render.com** (Free tier)
   - Free tier available
   - Auto-deploys from GitHub

3. **Fly.io** (Free tier)
   - Free tier: 3 VMs
   - Global deployment

**Steps (Railway example):**

1. Push code to GitHub
2. Go to: https://railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add environment variables
6. Get your URL: `https://your-app.railway.app`
7. Update .env: `WEBHOOK_URL=https://your-app.railway.app`

---

## Current Setup:

Your `.env` already has:
```
WEBHOOK_URL=https://nonelaborately-agamic-victoria.ngrok-free.dev/webhook
```

**To activate webhooks:**

1. Make sure ngrok is running on port 3000
2. Update WEBHOOK_URL if ngrok URL changed
3. Restart bot: `bun run dev`
4. Look for: `✅ Webhook set: ...`

---

## Troubleshooting:

**Bot still using polling?**
- Check if WEBHOOK_URL is set in .env
- Make sure ngrok/cloudflare is running
- Check bot logs for webhook errors

**Webhook not working?**
- Test webhook URL: `curl https://your-url.com/telegram-webhook`
- Check ngrok dashboard: http://localhost:4040
- Verify port 3000 is correct

**Want to switch back to polling?**
- Remove WEBHOOK_URL from .env
- Restart bot

---

## Recommendation:

**For Development:** Use Ngrok (easiest)
**For Production:** Deploy to Railway/Render (most reliable)

Your current ngrok URL will work, just make sure ngrok is running!
