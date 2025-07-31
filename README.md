# 🎨 Pixflux Batch Generation

<kbd><img width="2560" height="1440" alt="Saber" src="https://github.com/user-attachments/assets/8239c3e1-54b8-488f-be21-611a014d15ef" /></kbd>

**Generate hundreds of unique pixel art variations with complete transparency about what was created**

![Version](https://img.shields.io/badge/version-2.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![Awesome](https://img.shields.io/badge/status-awesome-ff69b4)

## ⚡ Quick Start

```bash
# Clone this beauty
git clone <repo-url>
cd pixellab-batch-generator

# Install frontend
npm install

# Start backend (in new terminal)
cd backend
npm install
npm start

# Start frontend (in original terminal)
npm run dev
```

**That's it!** Visit `http://localhost:5173` and start creating magic ✨

---

## 🚀 Why This Tool Will Change Your Pixel Art Game

### 🎲 **Dynamic Wildcard System That Actually Makes Sense**

<table>
<tr>
<td><kbd><img width="884" height="446" alt="Wildcard System" src="https://github.com/user-attachments/assets/3261e311-f732-46ee-8235-f269bd6f032f" /></kbd></td>
<td><kbd><img width="672" height="588" alt="Wildcard Editor" src="https://github.com/user-attachments/assets/44386b6a-ed2b-4fd5-a16c-9f611c2a830b" /></kbd></td>
</tr>
</table>

Forget copy-pasting prompts. Create **reusable collections** that work like magic:

```
Your prompt: "a __mood__ __creature__ with __colors__"
What happens: "a mysterious dragon with neon colors"
```

- **File-based storage** - Your wildcards are actual `.txt` files you can share
- **Click-to-add** - Just click any wildcard name to insert it
- **Auto-append magic** - Active wildcards automatically enhance every prompt
- **See what was chosen** - Complete transparency about selections

### 🔀 **Variation Syntax That Multiplies Your Creativity**

<kbd><img width="879" height="358" alt="Dynamic Prompting" src="https://github.com/user-attachments/assets/c1139dc4-7740-4997-8188-8d16cfb0f139" /></kbd>

One prompt, infinite possibilities:

```
"a {young|adult|ancient} {fire|ice|shadow} dragon"
```

This generates **9 unique combinations** from a single line. Combine with wildcards? Now we're talking thousands of variations!

### 📦 **Batch Queue That Respects Your Time (and API Limits)**

<kbd><img width="915" height="750" alt="Batch Queue System" src="https://github.com/user-attachments/assets/f1de999f-52bc-4318-bfe0-9ec41cd1860f" /></kbd>

Generate 1 to 100 images with:
- **Visual progress tracking** - See exactly what's happening
- **Smart rate limiting** - Never hit 429 errors again
- **Pause/resume anytime** - Full control over your generation
- **Individual failure handling** - One fail doesn't stop the show

### 🏷️ **Metadata System That Preserves Everything**

<kbd><img width="870" height="920" alt="Metadata System" src="https://github.com/user-attachments/assets/f5ad77ee-d6ef-4cd7-91fe-43c53bf30a1e" /></kbd>

Every PNG contains its complete generation history:
- Original prompt template
- Final processed prompt
- Every wildcard selection made
- All generation settings
- Timestamp and seed

**Drag and drop any image back to see exactly how it was made!**

### 👁️ **Complete Selection Transparency**

Know exactly what happened in every generation:

```
🎲 __styles__ → anime style
🔀 {cute|scary} → cute
🎲 __quality__ → masterpiece (auto-appended)
```

No more guessing why an image turned out great!

### 🎯 **Smart UI That Gets Out of Your Way**

- **Collapsible sections** - See only what you need
- **Server status indicator** - Know where your wildcards live
- **Keyboard navigation** - Arrow keys in gallery
- **One-click downloads** - Single images or entire batches as ZIP

### 💾 **Persistent Storage That Survives Everything**

- **Port changes? No problem** - Wildcards live on the server
- **Browser crash? All good** - Everything's in files
- **Want to share? Easy** - ZIP your wildcards folder
- **Version control? Sure** - It's just text files

## 🎨 Real-World Magic This Enables

### For Game Developers
Generate complete sprite sheets with variations:
- 100 character portraits with different moods
- 50 item icons with rarity variations  
- 20 environment tiles with weather effects

### For Artists
Explore styles systematically:
- Test your subject with 20 different art styles
- Generate mood boards with consistent themes
- Find unexpected combinations that spark joy

### For Content Creators
Build asset libraries at scale:
- Create themed collections in minutes
- Generate variations for A/B testing
- Build consistent visual languages

## 🔥 Features That Make This Special

### The Wildcard Manager
- Pre-loaded with 120 curated options across 6 categories
- Create unlimited custom wildcards
- Edit wildcards in-app or directly as text files
- See exactly which wildcards are active with visual badges

### The Batch Generator
- Real-time status with beautiful animations
- Graceful error handling with clear messages
- Memory-efficient processing
- Export everything with embedded metadata

### The Image Viewer
- Gallery with smooth navigation
- Progress bar showing your position
- Copy prompts with one click
- See all generation details at a glance

### The Metadata Reader
- Drag & drop any generated image
- Extract complete generation data
- See all dynamic selections made
- Perfect for learning what worked

## 🛠️ Technical Goodies

- **React + Vite** - Lightning fast development
- **Tailwind CSS** - Beautiful dark theme out of the box
- **Express Backend** - Simple, reliable file management
- **No database needed** - Everything is files
- **Standard PNG metadata** - Compatible with other tools
- **Clean, documented code** - Easy to understand and modify

## 📚 What's in the Box?

```
├── 🎨 6 default wildcards with 20 options each
├── 🔄 Dynamic prompt processor with variation support
├── 📦 Batch queue with visual feedback
├── 🏷️ Complete metadata preservation
├── 📁 File-based wildcard storage
├── 🎯 Selection transparency
├── ⚡ Smart rate limit handling
└── 💜 A tool built with love for pixel artists
```

## 🌟 Why We Built This

Traditional AI image generators are black boxes. You put in a prompt, you get an image, but you don't know:
- Which wildcard options were selected
- What random variations were chosen
- Why some images are better than others

**This tool changes that.** Every image comes with a complete record of its creation, making it a learning tool as much as a generation tool.

## 🚀 Coming Soon

- [ ] Prompt templates marketplace
- [ ] Wildcard sharing hub
- [ ] Generation analytics
- [ ] Style learning from favorites
- [ ] API support for other generators

## 💝 Built With Love

This tool was crafted with care for the pixel art community. Every feature was designed to give you more control, more transparency, and more creative possibilities.

**Special thanks to the PixelLab AI team for their amazing API!**

---

## 📖 Documentation

For detailed guides, visit the [/docs folder](./docs/):
- [Getting Started Guide](./docs/getting-started.md)
- [Wildcard System Deep Dive](./docs/wildcard-system.md)
- [Dynamic Prompting Mastery](./docs/dynamic-prompting.md)
- [Tips and Tricks](./docs/tips-and-tricks.md)

## 🤝 Contributing

We love contributions! Check out [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

## 📄 License

MIT License - Use this tool to create amazing things!

---

<p align="center">
  Made with 💜 by pixel art enthusiasts, for pixel art enthusiasts
</p>

<p align="center">
  <strong>Stop wondering what happened. Start knowing.</strong>
</p>
