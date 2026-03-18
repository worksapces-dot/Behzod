# Upstash Redis Setup (2 minutes) 🚀

## Why Upstash?
- ⚡ Super fast (global edge network)
- 🆓 Free tier: 10,000 commands/day
- 🔒 Persistent: Conversations survive bot restarts
- 🌐 Serverless: No server to manage
- 💰 Pay-as-you-go after free tier

## Setup Steps:

### 1. Create Account
Go to: https://console.upstash.com/
- Sign up with GitHub/Google (takes 30 seconds)

### 2. Create Redis Database
1. Click "Create Database"
2. Choose:
   - **Name**: behzod-memory
   - **Type**: Regional (faster) or Global (more reliable)
   - **Region**: Choose closest to your users (e.g., EU-West-1, US-East-1)
3. Click "Create"

### 3. Get Credentials
After creation, you'll see:
- **UPSTASH_REDIS_REST_URL**: Copy this
- **UPSTASH_REDIS_REST_TOKEN**: Copy this

### 4. Update .env
```bash
UPSTASH_REDIS_URL=https://your-db-name.upstash.io
UPSTASH_REDIS_TOKEN=your_token_here
```

### 5. Restart Bot
```bash
bun run dev
```

You should see: `✅ Using Upstash Redis for persistent memory`

## Done! 🎉

Now your bot will remember conversations even after restarts!

## Free Tier Limits:
- 10,000 commands/day
- 256 MB storage
- Perfect for 100-500 daily users

## Monitoring:
Check usage at: https://console.upstash.com/redis/your-db-name

## Troubleshooting:

**Error: "UPSTASH_REDIS_URL missing"**
- Make sure you added both URL and TOKEN to .env
- Restart the bot after updating .env

**Conversations still lost on restart?**
- Check bot logs for "Using Upstash Redis" message
- Verify credentials are correct in Upstash console
