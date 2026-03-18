# Mem0 Enhanced Usage Guide

## Overview
Mem0 is now fully integrated with advanced features for better user memory management and agent self-learning.

## What Changed

### Before (Basic Implementation)
- ✅ `getUserProfile` - Get all user memories
- ✅ `saveUserInfo` - Save user facts
- ❌ No search capability
- ❌ No categorization
- ❌ No metadata
- ❌ Agent couldn't learn from mistakes

### After (Enhanced Implementation)
- ✅ `getUserProfile` - Get all user memories
- ✅ `saveUserInfo` - Save user facts WITH categories & metadata
- ✅ `searchUserMemory` - Natural language search (NEW)
- ✅ `saveAgentLesson` - Agent self-learning (NEW)
- ✅ Automatic metadata tagging (timestamp, source, bot name)
- ✅ Category-based organization

## New Features

### 1. Memory Search (`searchUserMemory`)
Search through user memories using natural language instead of loading everything.

**When to use:**
- "What bugs did this user report before?"
- "What are their language preferences?"
- "What technical issues have they mentioned?"

**Example:**
```typescript
searchUserMemory({
  userId: "12345",
  query: "What issues did they report?",
  category: "issues" // optional filter
})
```

**Benefits:**
- Faster than loading all memories
- More precise results
- Can filter by category
- Returns top 5 most relevant memories

### 2. Memory Categories
Organize memories by type for better retrieval:

- **personal** - Name, role, company
- **preferences** - Language, notification settings
- **issues** - Past bugs they reported
- **technical** - Technical knowledge level
- **feedback** - Opinions about features

**Example:**
```typescript
saveUserInfo({
  userId: "12345",
  info: "User prefers Russian language",
  category: "preferences"
})
```

### 3. Automatic Metadata
Every memory now includes:
- `source: "telegram_bot"`
- `bot: "behzod"`
- `timestamp: ISO date`
- `category: user-specified`

This helps with:
- Filtering memories by date
- Tracking which bot saved what
- Organizing by source

### 4. Agent Self-Learning (`saveAgentLesson`)
Behzod can now learn from mistakes and remember behavioral rules.

**When to use:**
- Agent makes a mistake
- User corrects agent behavior
- You want agent to remember a rule

**Example:**
```typescript
saveAgentLesson({
  lesson: "Never repeat introduction in every message"
})
```

**Stored as:**
- `user_id: "behzod_agent_core"`
- Separate from user memories
- Can be retrieved to improve future behavior

## How Behzod Uses Mem0 Now

### On First Message:
1. Calls `getUserProfile` to load user context
2. Checks conversation history from Redis
3. Responds with context awareness

### During Conversation:
1. Uses `searchUserMemory` when needs specific info
   - "Did they report bugs before?"
   - "What's their preferred language?"
2. Saves new facts with `saveUserInfo` + category
3. Before creating Trello cards, searches past issues

### When Learning:
1. If user corrects behavior → `saveAgentLesson`
2. If agent makes mistake → `saveAgentLesson`
3. Lessons stored permanently for future reference

## API Endpoints Used

### Get All Memories
```
GET https://api.mem0.ai/v1/memories/?user_id={userId}
```

### Save Memory
```
POST https://api.mem0.ai/v1/memories/
Body: {
  messages: [{ role: "user", content: "..." }],
  user_id: "...",
  metadata: { category: "...", source: "...", ... }
}
```

### Search Memories
```
POST https://api.mem0.ai/v1/memories/search/
Body: {
  query: "natural language query",
  filters: {
    AND: [
      { user_id: "..." },
      { "metadata.category": "..." }
    ]
  },
  top_k: 5
}
```

## Best Practices

### 1. Use Search Over Get
- ❌ Don't: Load all memories every time
- ✅ Do: Use `searchUserMemory` for specific queries

### 2. Always Categorize
- ❌ Don't: Save without category
- ✅ Do: Always specify category when saving

### 3. Check Past Issues
- ❌ Don't: Create duplicate bug reports
- ✅ Do: Search past issues before creating Trello card

### 4. Learn From Mistakes
- ❌ Don't: Repeat same mistakes
- ✅ Do: Use `saveAgentLesson` when corrected

## Example Workflow

### Bug Reporting Flow:
```
1. User: "Login button not working"
2. Behzod: searchUserMemory(userId, "past issues", "issues")
3. Behzod: Checks if similar issue reported before
4. Behzod: Asks clarifying questions
5. Behzod: saveUserInfo(userId, "Reported login button issue", "issues")
6. Behzod: createTrelloCard(...)
```

### Personalization Flow:
```
1. User: "Speak Russian please"
2. Behzod: saveUserInfo(userId, "Prefers Russian language", "preferences")
3. Next conversation:
4. Behzod: getUserProfile(userId) → sees Russian preference
5. Behzod: Responds in Russian automatically
```

## Monitoring

Check Mem0 dashboard to see:
- Total memories stored
- Memories by category
- Search queries
- API usage

Dashboard: https://app.mem0.ai/

## Future Enhancements

Potential improvements:
- [ ] Date-based filtering (recent vs old memories)
- [ ] Memory importance scoring
- [ ] Automatic memory cleanup (old/irrelevant)
- [ ] Cross-user pattern detection
- [ ] Memory analytics dashboard

## Resources

- [Mem0 API Docs](https://docs.mem0.ai/api-reference)
- [Search Memory Guide](https://docs.mem0.ai/core-concepts/memory-operations/search)
- [Langchain Integration](https://docs.mem0.ai/integrations/langchain-tools)
