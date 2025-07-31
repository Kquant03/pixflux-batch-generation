# ⚡ Quick Start Guide

Get up and running in 5 minutes! This guide shows the fastest path to generating your first batch of pixel art.

## 🏃 Speed Run Setup

### 1. Clone and Install (2 minutes)

```bash
# Clone the repo
git clone <repository-url>
cd pixflux-batch-generation

# Install frontend
npm install

# Setup backend
mkdir backend && cd backend
npm init -y
npm install express cors
cd ..
```

### 2. Copy Backend Files (30 seconds)

Create `backend/server.js` with the server code from the docs.

### 3. Start Everything (30 seconds)

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend  
npm run dev
```

### 4. Open Browser

Navigate to `http://localhost:5173`

## 🎨 First Generation (2 minutes)

### 1. Enter API Key
Get from [pixellab.ai](https://www.pixellab.ai/pixellab-api) dashboard

### 2. Quick Test Prompt
```
a {red|blue|green} {dragon|unicorn|phoenix}
```

### 3. Generate
- Set batch to 9 images
- Click "Generate 9 Images"
- Watch the magic happen!

## 🎯 What to Read Next?

### "I want to understand wildcards"
→ [Wildcard System](./wildcard-system.md)

### "I want to create dynamic prompts"
→ [Dynamic Prompting](./dynamic-prompting.md)

### "I want to generate hundreds of images"
→ [Batch Queue](./batch-queue.md)

### "I want to understand the code"
→ [Frontend Architecture](./frontend-architecture.md)

### "I want to deploy this"
→ [Backend API](./backend-api.md#deployment-options)

## 💡 Quick Tips

### Wildcard Syntax
- `__styles__` - Use a wildcard
- `{a|b|c}` - Random choice
- Active wildcards auto-append

### Keyboard Shortcuts
- `←` `→` - Navigate images

### Server Status
- 🟢 Green = Files saved on server
- 🟡 Yellow = Using browser storage

### Rate Limits
- Free tier: 3-5 second delay
- Start with small batches

## 🚨 Common Issues

### "Server not connected"
```bash
cd backend && npm start
```

### "Rate limit exceeded"
Increase delay in batch settings

### "No wildcards"
Click "Reload from Server"

## 📦 What You Get

- **6 default wildcards** with 20 options each
- **Batch generation** up to 100 images
- **Complete metadata** in every PNG
- **File-based storage** that survives port changes

Ready? [Get Started](./getting-started.md) with the full guide!