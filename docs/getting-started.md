# 🚀 Getting Started

Welcome to Pixflux AI Batch Generation! This guide will walk you through installation, setup, and generating your first pixel art images.

## 📝 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Setup](#project-setup)
- [Starting the Application](#starting-the-application)
- [First Image](#first-image)
- [Understanding the Interface](#understanding-the-interface)
- [Next Steps](#next-steps)

## Prerequisites

### Required Software

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Git** (for cloning the repository)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### PixelLab AI Account

1. Visit [pixellab.ai](https://www.pixellab.ai)
2. Create an account
3. Navigate to your dashboard
4. Copy your API secret key

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pixflux-batch-generation.git
cd pixflux-batch-generation
```

### 2. Install Frontend Dependencies

```bash
# In the root directory
npm install
```

### 3. Set Up the Backend

```bash
# Create backend directory
mkdir backend
cd backend

# Create package.json
npm init -y

# Install backend dependencies
npm install express cors

# Copy server.js from docs
cp ../docs/examples/server.js .
```

## Project Setup

### Directory Structure

```
pixflux-batch-generation/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── wildcards/          # Created automatically
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── docs/
├── package.json
└── vite.config.js
```

### Environment Configuration

No `.env` file needed! The API key is entered directly in the UI for security.

## Starting the Application

### 1. Start the Backend Server

```bash
# Terminal 1: In the backend directory
cd backend
npm start

# You should see:
# Wildcard server running on http://localhost:3001
# Wildcards stored in: /path/to/backend/wildcards
```

### 2. Start the Frontend

```bash
# Terminal 2: In the root directory
npm run dev

# You should see:
# VITE ready in X ms
# ➜ Local: http://localhost:5173/
```

### 3. Open in Browser

Navigate to `http://localhost:5173` in your web browser.

## First Image

### Step 1: Enter API Key

1. Paste your PixelLab API secret in the first field
2. The key is stored only in your browser session

![API Key Field]

### Step 2: Write a Prompt

Try something simple first:

```
a cute pixel art cat
```

### Step 3: Choose Settings

For your first image, use these defaults:
- **Size**: 64x64
- **Outline**: single color black outline
- **Shading**: basic shading
- **Detail**: medium detail

### Step 4: Generate!

Click the "Generate 1 Image" button and watch your pixel art appear!

## Understanding the Interface

### Main Sections

#### 1. Basic Settings
- **Description**: Your prompt/template
- **Negative Description**: What to avoid
- **Size**: Image dimensions (presets available)

#### 2. Style Options
- **Outline**: Border style for sprites
- **Shading**: Lighting complexity
- **Detail Level**: Overall detail amount

#### 3. Advanced Options
- **Guidance Scale**: How closely to follow prompt (1-20)
- **No Background**: Transparent background (size limited)
- **Seed**: For reproducible results

#### 4. Wildcard Manager
- **Active Wildcards**: Auto-append to all prompts
- **Manual Placement**: Use `__wildcard__` in prompts
- **Server Status**: Shows if wildcards are file-based

#### 5. Batch Queue
- **Batch Size**: 1-100 images
- **Delay**: Time between requests (rate limiting)
- **Visual Status**: See progress in real-time

### Server Connection Indicator

Look for the status indicator in the Wildcard Manager:
- 🟢 **Green**: Server connected, wildcards saved as files
- 🟡 **Yellow**: Using localStorage fallback

## Your First Batch

### Step 1: Create a Dynamic Prompt

```
a {happy|sad|angry} pixel art {cat|dog|bird}
```

This can generate 9 different combinations!

### Step 2: Set Batch Size

1. Move the batch slider to 9
2. Set delay to 2 seconds (safe for free tier)

### Step 3: Generate Batch

Click "Generate 9 Images" and watch the queue process each variation.

### Step 4: Review Results

- Use arrow keys to navigate images
- Check "Dynamic Selections" to see what was chosen
- Download favorites with embedded metadata

## Understanding Wildcards

### Default Wildcards

The system comes with 6 pre-installed wildcards:
- **artists**: Famous artist styles
- **styles**: Art movements
- **moods**: Emotional qualities
- **lighting**: Lighting conditions
- **colors**: Color schemes
- **quality**: Quality descriptors

### Using Wildcards

1. **Auto-Append**: Check wildcards to add to all prompts
2. **Manual Placement**: Type `__styles__` in your prompt
3. **Click to Add**: Click wildcard names to insert

### Example with Wildcards

```
Prompt: "a dragon"
Active: styles, moods, lighting

Result: "a dragon, anime style, mysterious, dramatic lighting"
```

## Troubleshooting First Run

### "Failed to load wildcards"
- Make sure backend is running on port 3001
- Check backend terminal for errors
- Try "Reload from Server" button

### "Rate limit exceeded"
- Increase delay between requests
- Use smaller batch sizes
- Wait a few minutes before retrying

### Images not generating
- Verify API key is correct
- Check browser console for errors
- Ensure proper internet connection

### Server not starting
- Check if port 3001 is in use
- Verify Node.js is installed
- Check backend dependencies installed

## Next Steps

### 1. Explore Wildcards
- Create custom wildcard collections
- Experiment with combinations
- Study successful selections

### 2. Master Dynamic Prompts
- Learn variation syntax: `{option1|option2}`
- Combine with wildcards for variety
- Use batch generation to test

### 3. Understand Metadata
- Download and re-upload images
- See complete generation history
- Share techniques with metadata

### 4. Optimize Workflow
- Find ideal batch sizes
- Tune delays for your tier
- Build prompt templates

## Quick Reference Card

### Essential Shortcuts
- **Arrow Keys**: Navigate images
- **Click Wildcards**: Add to prompt
- **Drag & Drop**: Read metadata

### Syntax Cheatsheet
- `{a|b|c}`: Random choice
- `__wildcard__`: Use wildcard
- Active wildcards: Auto-append

### Recommended Settings
- **Free Tier**: 3-5 second delay
- **First Tests**: 5-10 image batches
- **Size**: Start with 64x64

---

Ready to create amazing pixel art? Head to [Creating Wildcards](./creating-wildcards.md) to build your own collections!